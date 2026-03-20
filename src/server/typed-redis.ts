import { createRedisPool, type RedisPool } from "@/lib/redis-pool";
import { zJobResolved, zJobResult, zJobStatus } from "@/server/schemas";
import { DisposableRedis, isReplyError } from "@/types/redis";
import { on } from "events";
import Redis from "ioredis";
import z, { ZodError } from "zod";
import { baseLogger } from "../lib/logger";

export const JOB_QUEUE = "jobs" as const;
export const JOB_RESULTS = "results" as const;

type TypedRedisErrorCode =
  | "PARSE_ERROR"
  | "INTERNAL_ERROR"
  | "GENERIC_ERROR"
  | "STRING_ERROR"
  | "UNKNOWN_ERROR";

export class TypedRedisError extends Error {
  public override readonly name: "TypedRedisError" = "TypedRedisError" as const;

  constructor(
    public readonly code: TypedRedisErrorCode,
    opts?: {
      message?: string;
      cause?: unknown;
    },
  ) {
    const { message = `TypedRedisError: ${code}`, cause } = opts || {};
    super(message, { cause });
  }
}

const redisLogger = baseLogger.child({}, { msgPrefix: "[REDIS] " });
const handleError = (
  method: string,
  cause: unknown,
  context?: Record<string, string>,
  log: boolean = true,
): never => {
  if (cause instanceof ZodError) {
    const message = `(${method}) Failed to parse data using zod`;
    const ctx = {
      parserError: z.prettifyError(cause),
      ...context,
    };
    if (log) redisLogger.error(ctx, message);
    throw new TypedRedisError("PARSE_ERROR", { message, cause });
  } else if (isReplyError(cause)) {
    const message = `(${method}) Encountered redis internal error`;
    const ctx = {
      name: cause.name,
      command: cause.command,
      redisErrorMsg: cause.message,
      ...context,
    };
    if (log) redisLogger.error(ctx, message);
    throw new TypedRedisError("INTERNAL_ERROR", { message, cause });
  } else if (cause instanceof Error) {
    const message = `(${method}) Encountered some error type`;
    const ctx = {
      name: cause.name,
      genericErrorMsg: cause.message,
      ...context,
    };
    if (log) redisLogger.error(ctx, message);
    throw new TypedRedisError("GENERIC_ERROR", { message, cause });
  } else if (typeof cause === "string") {
    const message = `(${method}) Encountered string exception`;
    const ctx = {
      strMessage: cause,
      ...context,
    };
    if (log) redisLogger.error(ctx, message);
    throw new TypedRedisError("STRING_ERROR", { message, cause });
  } else {
    const message = `(${method}) Encountered unknown exception type`;
    if (log) redisLogger.error({ ...context }, message);
    throw new TypedRedisError("UNKNOWN_ERROR", { message, cause });
  }
};

const keys = {
  job: (id: string) => `job:${id}` as const,
  jobFile: (id: string) => `job:file:${id}` as const,
  result: (id: string) => `result:${id}` as const,
  status: (id: string) => `status:${id}` as const,
};

// submit any job
export async function enqueueJob(
  redis: Redis,
  input: z.infer<typeof zJobResolved>,
) {
  const jobKey = keys.job(input.id);
  const fileKey = keys.jobFile(input.id);
  try {
    const { file, ...rest } = input;
    await redis.lpush(JOB_QUEUE, input.id);
    await redis.hset(jobKey, rest);
    await redis.set(fileKey, file);
    redisLogger.info(
      {
        JOB_QUEUE,
        jobKey,
        fileKey,
      },
      "Enqueued job",
    );
  } catch (error) {
    return handleError("enqueueJob", error);
  }
}

// consume any job
export async function consumeJob(
  redis: Redis,
  timeout: number,
): Promise<z.infer<typeof zJobResolved> | null> {
  try {
    const result = await redis.brpop(JOB_QUEUE, timeout);
    // timed out
    if (result === null) {
      return null;
    }
    const [_, jobId] = result;
    // fetch from set and parse
    const jobKey = keys.job(jobId);
    const fileKey = keys.jobFile(jobId);
    const hgetData = await redis.hgetall(jobKey);
    const file = await redis.getBuffer(fileKey);

    redisLogger.info(
      {
        fileKey,
        jobKey,
        file: file?.toString() || null,
        hgetData,
      },
      "Dequeued job",
    );

    const parsed = zJobResolved.parse({
      ...hgetData,
      file,
    });
    await redis.del(jobKey, fileKey);
    return parsed;
  } catch (error) {
    // returns never -- satisfies ts
    return handleError("consumeJob", error);
  }
}

// submit specific job result
export async function submitJobResult(
  redis: Redis,
  input: z.infer<typeof zJobResult>,
) {
  const key = keys.result(input.id);
  try {
    await redis.hset(key, input);
  } catch (error) {
    return handleError("submitJobResult", error, { key });
  }
}

// fetch job result or null if non-existant
export async function fetchJobResult(
  redis: Redis,
  jobId: string,
): Promise<z.infer<typeof zJobResult> | null> {
  const key = keys.result(jobId);
  try {
    const data = await redis.hgetall(key);
    const parsed = zJobResult.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch (error) {
    return handleError("fetchJobResult", error, { key });
  }
}

// pub
export async function submitJobStatus(
  redis: Redis,
  input: z.infer<typeof zJobStatus>,
) {
  const key = keys.result(input.id);
  try {
    await redis.publish(key, JSON.stringify(input));
  } catch (error) {
    return handleError("submitJobStatus", error, { key });
  }
}

// sub
export class JobStatusConsumer {
  #ac = new AbortController();
  #destroyed = false;
  #timer: NodeJS.Timeout | null = null;

  private constructor(
    readonly redisPool: RedisPool,
    readonly redis: DisposableRedis,
    readonly jobId: string,
    readonly channelKey: string,
    readonly timeout?: number,
  ) {}

  static async create(redisPool: RedisPool, id: string, timeout?: number) {
    const channelKey = keys.result(id);
    const redis = await redisPool.acquire();
    const consumer = new JobStatusConsumer(
      redisPool,
      redis,
      id,
      channelKey,
      timeout,
    );
    await consumer.redis.subscribe(channelKey);
    return consumer;
  }

  async destroy() {
    if (this.#destroyed) {
      return;
    }
    this.#destroyed = true;

    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }

    this.#ac.abort();
    try {
      await Promise.allSettled([this.redis.unsubscribe(this.channelKey)]);
    } finally {
      await this.redisPool.destroy(this.redis);
    }
  }

  async *#iterate(): AsyncGenerator<z.infer<typeof zJobStatus>> {
    if (this.timeout) {
      this.#timer = setTimeout(() => void this.destroy(), this.timeout);
    }

    const messages = on(this.redis, "message", { signal: this.#ac.signal });
    try {
      for await (const [channel, message] of messages) {
        if (channel !== this.channelKey) {
          continue;
        }

        const status = zJobStatus.safeParse(message);
        if (status.success) {
          yield status.data;
        } else {
          const parserError = z.prettifyError(status.error);
          redisLogger.warn(
            { parserError, channel, message },
            "Failed to parse message",
          );
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        return handleError("JobStatusConsumer.#iterate", error, {
          key: this.channelKey,
        });
      }
      // happy path, got abort signal so we exit gracefully w/ timeout
      yield { status: "timed-out", id: this.jobId, type: "status" };
    }
  }

  [Symbol.asyncIterator]() {
    return this.#iterate();
  }

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}

export class RedisManager {
  private constructor(private readonly redisPool: RedisPool) {}

  static create = async () => {
    const pool = await createRedisPool();
    return new RedisManager(pool);
  };

  destoy = async () => {
    await this.redisPool.drain();
    await this.redisPool.clear();
  };

  enqueueJob = async (input: z.infer<typeof zJobResolved>) => {
    const redis = await this.redisPool.acquire();
    try {
      await enqueueJob(redis, input);
    } finally {
      await this.redisPool.destroy(redis);
    }
  };

  consumeJob = async (timeout: number) => {
    const redis = await this.redisPool.acquire();
    try {
      return await consumeJob(redis, timeout);
    } finally {
      await this.redisPool.destroy(redis);
    }
  };

  fetchJobResult = async (jobId: string) => {
    const redis = await this.redisPool.acquire();
    try {
      return await fetchJobResult(redis, jobId);
    } finally {
      await this.redisPool.destroy(redis);
    }
  };

  submitJobStatus = async (input: z.infer<typeof zJobStatus>) => {
    const redis = await this.redisPool.acquire();
    try {
      // void
      await submitJobStatus(redis, input);
    } finally {
      await this.redisPool.destroy(redis);
    }
  };

  submitJobResult = async (input: z.infer<typeof zJobResult>) => {
    const redis = await this.redisPool.acquire();
    try {
      await submitJobResult(redis, input);
    } finally {
      await this.redisPool.destroy(redis);
    }
  };

  async [Symbol.asyncDispose]() {
    await this.destoy();
  }
}
