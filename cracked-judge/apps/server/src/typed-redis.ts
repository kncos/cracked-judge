import { CrackedError } from "@cracked-judge/common";
import {
  deserializeJob,
  deserializeJobResult,
  serializeJob,
  serializeJobResult,
  zJob,
  zJobResult,
} from "@cracked-judge/common/contract";
import { createRedisPool, type RedisPool } from "./redis-pool";

import { ReplyError } from "ioredis";
import z, { ZodError } from "zod/v4";
import { redisLogger } from "./lib/logger";

export const JOB_QUEUE = "jobs" as const;
export const RESULT_QUEUE = "results" as const;

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

const keys = {
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
      const key = keys.job(input.id);
      logger.debug("Serializing Job...");
      const serialized = await serializeJob(input);
      logger.debug(`Setting job key: ${key}`);
      await redis.set(key, serialized);
      logger.debug(`pushing id to ${JOB_QUEUE}: ${input.id}`);
      await redis.lpush(JOB_QUEUE, input.id);
      logger.debug(`finished`);
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
      logger.debug(`waiting for job in queue: ${JOB_QUEUE}`);
      const popped = await redis.brpop(JOB_QUEUE, timeoutSec);
      // null if it timed out
      if (popped === null) {
        logger.debug(`popped null job`);
        return null;
      }
      const [_, id] = popped;
      logger.debug(`got id ${id}`);
      const key = keys.job(id);
      logger.debug(`getting buffer for key: ${key}`);
      const serialized = await redis.getBuffer(key);
      if (serialized === null) {
        throw new CrackedError("REDIS_ERROR", {
          message: `Found key (${key}) but no associated data buffer`,
        });
      }
      logger.debug(`deserializing job...`);
      const deserialized = deserializeJob(serialized);
      logger.debug(`deleting old key`);
      await redis.del(key);
      logger.debug(`finished`);
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
      const key = keys.result(input.id);
      logger.debug(`Serializing result for key ${key}...`);
      const serialized = await serializeJobResult(input);
      logger.debug(`Setting ${key} in redis`);
      await redis.set(key, serialized);
      logger.debug(`Adding ${input.id} on queue ${RESULT_QUEUE}`);
      await redis.lpush(RESULT_QUEUE, input.id);
      logger.debug("finished");
    } catch (e) {
      return handleRedisError("enqueueJobResult", e);
    } finally {
      await this.redisPool.destroy(redis);
    }
  };

  dequeueJobResult = async (timeoutSec: number = 30) => {
    const redis = await this.redisPool.acquire();
    const logger = redisLogger.child({}, { msgPrefix: "dequeueJobResult: " });
    try {
      logger.debug("popping job result...");
      const popped = await redis.brpop(RESULT_QUEUE, timeoutSec);
      // null if it timed out
      if (popped === null) {
        logger.debug("popping popped null job result");
        return null;
      }
      const [_, id] = popped;
      logger.debug(`Popped job ${id}`);
      const key = keys.result(id);
      logger.debug(`Getting buffer for key ${key}`);
      const serialized = await redis.getBuffer(key);
      if (serialized === null) {
        throw new CrackedError("REDIS_ERROR", {
          message: `Found key (${key}) but no associated data buffer`,
        });
      }
      logger.debug(`deserializing...`);
      const deserialized = deserializeJobResult(serialized);
      logger.debug(`removing key ${key}`);
      await redis.del(key);
      logger.debug("finished");
      return deserialized;
    } catch (e) {
      return handleRedisError("dequeueJobResult", e);
    } finally {
      await this.redisPool.destroy(redis);
    }
  };

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}
