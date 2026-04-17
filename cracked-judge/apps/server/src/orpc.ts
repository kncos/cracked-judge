import { apiRouterContract } from "@cracked-judge/common/contract";
import { implement } from "@orpc/server";
import { serverLogger } from "./lib/logger";
import type { RedisManager } from "./typed-redis";

export type BaseCtx = {
  // redisPool: RedisPool;
  redisManager: RedisManager;
};

export type WebsocketCtx = BaseCtx & {
  // redis: DisposableRedis;
  openedAt: number;
};

const o = implement(apiRouterContract).$context<BaseCtx>();

const timingMiddleware = o.middleware(async ({ next, path }) => {
  const start = Date.now();
  const result = await next();
  const end = Date.now();
  serverLogger.trace(
    `${path.join("/")}: time elapsed ${String(end - start)}ms`,
  );
  return result;
});

export const vmRoute = o.$context<WebsocketCtx>().use(timingMiddleware);
export const publicRoute = o.$context<BaseCtx>().use(timingMiddleware);
