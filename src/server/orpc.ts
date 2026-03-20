import type { DisposableRedis } from "@/types/redis";
import { os } from "@orpc/server";
import type { Logger } from "pino";

const o = os.$context<ServerCtx>();

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

export const vmRoute = o.use(timingMiddleware);
export const publicRoute = o.use(timingMiddleware);

export type ServerCtx = {
  serverLogger: Logger;
  openedAt: number;
  redis: DisposableRedis;
};
