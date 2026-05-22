import { CrackedError } from "@cracked-judge/common";
import { deserializeJob, serializeJob } from "@cracked-judge/common/contract";
import { zJob, zJobResult } from "@cracked-judge/common/db";
import { createRedisPool, type RedisPool } from "./redis-pool";

import { ReplyError } from "ioredis";
import z, { ZodError } from "zod/v4";
import { redisLogger } from "./lib/logger";

export const JOB_QUEUE = "jobs" as const;
export const RESULTS_SINK_QUEUE = "results" as const;

declare module "ioredis" {
  export interface ReplyError extends Error {
    readonly name: "ReplyError";
    readonly command?: {
      name: string;
      args: string[];
    };
  }
}

export const isReplyError = (error: unknown): error is ReplyError => {
  if (error === null || error === undefined || typeof error !== "object")
    return false;

  if ("name" in error && error.name === "ReplyError") return true;
  if (error instanceof ReplyError) return true;

  return false;
};

const handleRedisError = (
  method: string,
  cause: unknown,
  context?: Record<string, string>,
  log: boolean = true,
): never => {
  const err = log
    ? redisLogger.error.bind(redisLogger)
    : redisLogger.silent.bind(redisLogger);

  if (isReplyError(cause)) {
    err({ method, ...context }, cause.message);
  } else if (cause instanceof ZodError) {
    err({ method, ...context }, z.prettifyError(cause));
  } else if (cause instanceof Error) {
    err({ method, ...context }, cause.message);
  } else {
    err({ method, cause, ...context }, "unknown error type");
  }

  throw new CrackedError("REDIS_ERROR", { cause });
};

const keyPrefixer = {
  job: (id: string) => `job:${id}` as const,
  result: (id: string) => `result:${id}` as const,
};

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
    const logger = redisLogger.child({}, { msgPrefix: "enqueueJob: " });
    try {
      logger.debug("serializing job...");
      const serialized = serializeJob(input);
      logger.debug("adding job to queue...");
      await redis.lpush(JOB_QUEUE, serialized);
      logger.debug("DONE: job queued!");
    } catch (e) {
      return handleRedisError("enqueueJob", e);
    } finally {
      await this.redisPool.destroy(redis);
    }
  };

  dequeueJob = async (timeoutSec: number = 30) => {
    const redis = await this.redisPool.acquire();
    const logger = redisLogger.child({}, { msgPrefix: "dequeueJob: " });
    try {
      logger.debug(`waiting for job in queue: ${JOB_QUEUE}...`);
      const popped = await redis.brpopBuffer(JOB_QUEUE, timeoutSec);
      // null if it timed out
      if (popped === null) {
        logger.debug(`timed out, returning null.`);
        return null;
      }
      const [_, serialized] = popped;
      logger.debug(`deserializing job...`);
      const deserialized = deserializeJob(serialized);
      logger.debug(`finished.`);
      return deserialized;
    } catch (e) {
      return handleRedisError("dequeueJob", e);
    } finally {
      await this.redisPool.destroy(redis);
    }
  };

  enqueueJobResult = async (input: z.infer<typeof zJobResult>) => {
    const redis = await this.redisPool.acquire();
    const logger = redisLogger.child({}, { msgPrefix: "enqueueJobResult: " });
    try {
      logger.debug("Serializing job result...");
      const serialized = JSON.stringify(input);
      logger.debug("Adding job result to queues...");
      await redis
        .pipeline()
        .lpush(RESULTS_SINK_QUEUE, serialized)
        .lpush(keyPrefixer.result(input.id), serialized)
        // automatic clean up, we would never be waiting 10 minutes
        .expire(keyPrefixer.result(input.id), 600)
        .exec();
      logger.debug("Job Result enqueued.");
    } catch (e) {
      return handleRedisError("enqueueJobResult", e);
    } finally {
      await this.redisPool.destroy(redis);
    }
  };

  consumeJobResults = async (params: {
    batchSize: number;
    timeout: number;
  }) => {
    const { batchSize, timeout } = params;
    const redis = await this.redisPool.acquire();
    const logger = redisLogger.child({}, { msgPrefix: "consumeJobResults: " });
    try {
      const res = await redis.blmpop(
        timeout,
        1,
        RESULTS_SINK_QUEUE,
        "LEFT",
        "COUNT",
        batchSize,
      );
      if (res === null) {
        logger.debug("No results to consume (timed out).");
        return null;
      }
      const results = res[1].map((serialized) =>
        zJobResult.parse(JSON.parse(serialized)),
      );
      return results;
    } catch (e) {
      return handleRedisError("consumeJobResults", e);
    } finally {
      await this.redisPool.destroy(redis);
    }
  };

  awaitJobResult = async (params: { jobId: string; timeout: number }) => {
    const { jobId, timeout } = params;
    const redis = await this.redisPool.acquire();
    const logger = redisLogger.child({}, { msgPrefix: "awaitJobResult: " });
    try {
      logger.debug("Waiting for job result... ");
      const popped = await redis.brpop(keyPrefixer.result(jobId), timeout);
      if (popped === null) {
        logger.debug("No job result (timed out).");
        return null;
      }
      const [_, serialized] = popped;
      logger.debug("Deserializing job result...");
      const result = zJobResult.parse(JSON.parse(serialized));
      logger.debug("Done!");
      return result;
    } catch (e) {
      return handleRedisError("awaitJobResult", e);
    } finally {
      await this.redisPool.destroy(redis);
    }
  };

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}
