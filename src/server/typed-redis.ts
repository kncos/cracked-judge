import { handleError } from "@/lib/cracked-error";
import { createRedisPool, type RedisPool } from "@/lib/redis-pool";
import {
  deserializeJob,
  deserializeJobResult,
  serializeJob,
  serializeJobResult,
  zJob,
  zJobResult,
  zJobStatus,
} from "@/server/schemas";
import { DisposableRedis } from "@/types/redis";
import { on } from "events";
import Redis from "ioredis";
import z from "zod";
import { baseLogger } from "../lib/logger";

export const JOB_QUEUE = "jobs" as const;
export const JOB_RESULTS = "results" as const;

const redisLogger = baseLogger.child({}, { msgPrefix: "[REDIS] " });
const handleRedisError = (
  method: string,
  cause: unknown,
  context?: Record<string, string>,
  log: boolean = true,
): never => {
  return handleError(cause, {
    context,
    writeLog: log,
    logger: redisLogger.child({}, { msgPrefix: `(${method}) ` }),
  });
};

const keys = {
  job: (id: string) => `job:${id}` as const,
  jobFile: (id: string) => `job:file:${id}` as const,
  result: (id: string) => `result:${id}` as const,
  status: (id: string) => `status:${id}` as const,
};

// submit any job
export async function enqueueJob(redis: Redis, input: z.infer<typeof zJob>) {
  const jobKey = keys.job(input.id);
  const serialized = await serializeJob(input);
  try {
    await redis.set(jobKey, serialized);
    //! note: this comes last because if not, its a race condition!
    await redis.lpush(JOB_QUEUE, input.id);
    redisLogger.info(
      {
        JOB_QUEUE,
        jobKey,
      },
      "Enqueued job",
    );
  } catch (error) {
    return handleRedisError("enqueueJob", error);
  }
}

// consume any job
export async function consumeJob(
  redis: Redis,
  timeout: number,
): Promise<z.infer<typeof zJob> | null> {
  try {
    const result = await redis.brpop(JOB_QUEUE, timeout);
    // timed out
    if (result === null) {
      return null;
    }
    const [_, jobId] = result;
    // fetch from set and parse
    const jobKey = keys.job(jobId);
    const rawJob = await redis.getBuffer(jobKey);
    if (rawJob === null) {
      redisLogger.warn({ jobKey }, "Null job for this key");
      return null;
    }
    redisLogger.info({ jobKey }, "Dequeued job");

    const job = deserializeJob(rawJob);
    await redis.del(jobKey);
    return job;
  } catch (error) {
    // returns never -- satisfies ts
    return handleRedisError("consumeJob", error);
  }
}

// submit specific job result
export async function submitJobResult(
  redis: Redis,
  input: z.infer<typeof zJobResult>,
) {
  const key = keys.result(input.id);
  try {
    await redis.set(key, serializeJobResult(input));
    redisLogger.info(
      `Submitted result for key: ${key}, ${JSON.stringify(input, null, 2)}`,
    );
  } catch (error) {
    return handleRedisError("submitJobResult", error, { key });
  }
}

// fetch job result or null if non-existant
export async function fetchJobResult(
  redis: Redis,
  jobId: string,
): Promise<z.infer<typeof zJobResult> | null> {
  const key = keys.result(jobId);
  try {
    const data = await redis.getBuffer(key);
    if (data === null) return null;

    const parsed = deserializeJobResult(data);
    redisLogger.info(
      `Getting job result for ${key}, data: ${JSON.stringify(parsed, null, 2)}`,
    );
    return parsed;
  } catch (error) {
    return handleRedisError("fetchJobResult", error, { key });
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
    return handleRedisError("submitJobStatus", error, { key });
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
        return handleRedisError("JobStatusConsumer.#iterate", error, {
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

  destroy = async () => {
    redisLogger.debug("Draining redis pool...");
    await this.redisPool.drain();
    redisLogger.debug("Clearing redis pool...");
    await this.redisPool.clear();
    redisLogger.debug("redis manager cleaned up");
  };

  enqueueJob = async (input: z.infer<typeof zJob>) => {
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

  async *jobStatusIterator(
    jobId: string,
    timeout?: number,
  ): AsyncGenerator<z.infer<typeof zJobStatus>> {
    const redis = await this.redisPool.acquire();
    let timer: NodeJS.Timeout | null = null;
    const key = keys.result(jobId);
    const ac = new AbortController();

    const cleanup = async () => {
      if (timer) clearTimeout(timer);
      ac.abort();
      // this method can be called twice, if so, this throws
      // without this condition
      if (this.redisPool.isBorrowedResource(redis)) {
        await Promise.allSettled([redis.unsubscribe(key)]);
        // this is what throws, unsubscribe seems to be a no-op
        await this.redisPool.destroy(redis);
      }
    };

    try {
      await redis.subscribe(key);
      if (timeout) {
        timer = setTimeout(() => void cleanup(), timeout);
      }

      const messages = on(redis, "message", { signal: ac.signal });
      try {
        for await (const [channel, message] of messages) {
          if (channel !== key) {
            continue;
          }
          const status = zJobStatus.parse(JSON.parse(message as string));
          yield status;
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          return handleRedisError("jobStatusIterator", error, { key });
        }
        yield { status: "timed-out", id: jobId, type: "status" };
      }
    } finally {
      await cleanup();
    }
  }

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}
