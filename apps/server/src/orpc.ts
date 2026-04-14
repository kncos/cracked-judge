import { os } from "@orpc/server";
import type { Logger } from "pino";
import type { RedisManager } from "./typed-redis";

export type BaseCtx = {
  //TODO: remove, use logger middleware provided by orpc
  serverLogger: Logger;
  // redisPool: RedisPool;
  redisManager: RedisManager;
};

export type WebsocketCtx = BaseCtx & {
  // redis: DisposableRedis;
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

export const vmRoute = o.$context<WebsocketCtx>().use(timingMiddleware);

export const publicRoute = o.$context<BaseCtx>().use(timingMiddleware);
