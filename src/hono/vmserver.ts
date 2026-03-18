import { baseLogger } from "@/lib/logger";
import { RedisRegistry } from "@/lib/redis-registry";
import { tryCatch } from "@/lib/utils";
import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import { createMiddleware } from "hono/factory";
import type { Logger } from "pino";

declare module "hono" {
  interface ContextVariableMap {
    appLogger: Logger;
    redisKey: string;
  }
}

const redisRegistry = new RedisRegistry();
const vmApp = new Hono();

const appLogger = createMiddleware(async (c, next) => {
  const appLogger = baseLogger.child(
    { path: c.req.path },
    { msgPrefix: "[VM Server] " },
  );
  c.set("appLogger", appLogger);
  await next();
});

const useRedis = createMiddleware(async (c, next) => {
  const { data, error } = await tryCatch(redisRegistry.allocate());
  if (error) {
    const appLogger = c.get("appLogger");
  }

  c.set("redisKey", allocate);
  await next();
});

vmApp.use(appLogger);

vmApp.get(
  "/requestJob",
  upgradeWebSocket((c) => {
    return {
      onMessage(event, ws) {},
      onClose(ws) {},
      onOpen(ws) {},
    };
  }),
);
