import { type RedisPool } from "@/lib/redis-pool";
import type { DisposableRedis } from "@/types/redis";
import { os } from "@orpc/server";
import type { Logger } from "pino";

export type BaseCtx = {
  //TODO: remove, use logger middleware provided by orpc
  serverLogger: Logger;
  redisPool: RedisPool;
};

export type WebsocketCtx = BaseCtx & {
  redis: DisposableRedis;
  openedAt: number;
};

const o = os.$context<BaseCtx>();

const timingMiddleware = o.middleware(async ({ next, context, path }) => {
  const { serverLogger } = context;

  const start = Date.now();
  const result = await next();
  const end = Date.now();
  serverLogger.trace(
    `${path.join("/")}: time elapsed ${String(end - start)}ms`,
  );
  return result;
});

const httpRedisMiddleware = o.middleware(
  async ({ next, context, signal, path }) => {
    const { redisPool, serverLogger } = context;

    const redis = await redisPool.acquire();
    if (signal) {
      signal.addEventListener("abort", () => {
        void redisPool.destroy(redis);
      });
    } else {
      serverLogger.warn({ path }, "No signal provided to clean up redis");
    }

    return await next({
      context: {
        ...context,
        redis,
      },
    });
  },
);

export const vmRoute = o.$context<WebsocketCtx>().use(timingMiddleware);

export const publicRoute = o
  .$context<BaseCtx>()
  .use(timingMiddleware)
  .use(httpRedisMiddleware);
