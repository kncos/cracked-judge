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
    try {
      const key = keys.job(input.id);
      const serialized = await serializeJob(input);
      await redis.set(key, serialized);
      await redis.lpush(JOB_QUEUE, input.id);
    } catch (e) {
      return handleRedisError("enqueueJob", e);
    } finally {
      await this.redisPool.destroy(redis);
    }
  };

  dequeueJob = async (timeoutSec: number = 30) => {
    const redis = await this.redisPool.acquire();
    try {
      const popped = await redis.brpop(JOB_QUEUE, timeoutSec);
      // null if it timed out
      if (popped === null) {
        return null;
      }
      const [_, id] = popped;
      const key = keys.job(id);
      const serialized = await redis.getBuffer(key);
      if (serialized === null) {
        throw new CrackedError("REDIS_ERROR", {
          message: `Found key (${key}) but no associated data buffer`,
        });
      }
      const deserialized = deserializeJob(serialized);
      await redis.del(key);
      return deserialized;
    } catch (e) {
      return handleRedisError("dequeueJob", e);
    } finally {
      await this.redisPool.destroy(redis);
    }
  };

  enqueueJobResult = async (input: z.infer<typeof zJobResult>) => {
    const redis = await this.redisPool.acquire();
    try {
      const key = keys.result(input.id);
      const serialized = await serializeJobResult(input);
      await redis.set(key, serialized);
      await redis.lpush(RESULT_QUEUE, input.id);
    } catch (e) {
      return handleRedisError("enqueueJobResult", e);
    } finally {
      await this.redisPool.destroy(redis);
    }
  };

  dequeueJobResult = async (timeoutSec: number = 30) => {
    const redis = await this.redisPool.acquire();
    try {
      const popped = await redis.brpop(RESULT_QUEUE, timeoutSec);
      // null if it timed out
      if (popped === null) {
        return null;
      }
      const [_, id] = popped;
      const key = keys.result(id);
      const serialized = await redis.getBuffer(key);
      if (serialized === null) {
        throw new CrackedError("REDIS_ERROR", {
          message: `Found key (${key}) but no associated data buffer`,
        });
      }
      const deserialized = deserializeJobResult(serialized);
      await redis.del(key);
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
