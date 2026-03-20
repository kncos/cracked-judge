import { baseLogger } from "@/lib/logger";
import { createRedisPool } from "@/lib/redis-pool";
import { RPCHandler as RPCHandlerWs } from "@orpc/server/bun-ws";
import { RPCHandler } from "@orpc/server/fetch";
import type { Logger } from "pino";
import { judge } from "./api/judge";
import { vm } from "./api/vm";
import { type BaseCtx, type WebsocketCtx } from "./orpc";

const createHandlers = () => {
  const workerHandler = new RPCHandlerWs<WebsocketCtx>(vm, {
    filter: ({ contract }) => {
      if (contract["~orpc"].route.tags?.includes("public")) return false;
      return true;
    },
  });

  // disallow public routes from matching worker routes
  const publicHandler = new RPCHandler<BaseCtx>(judge, {
    filter: ({ contract }) => {
      if (contract["~orpc"].route.tags?.includes("worker")) return false;
      return true;
    },
  });

  return { workerHandler, publicHandler };
};

export class Server implements AsyncDisposable {
  private static port: number = 3000;
  private constructor(
    private readonly server: Bun.Server<WebsocketCtx>,
    private readonly serverLogger: Logger,
  ) {}

  static create = async () => {
    // handlers
    const { workerHandler, publicHandler } = createHandlers();
    // redisPool, serverLogger
    const serverLogger = baseLogger.child({}, { msgPrefix: "[server] " });
    const redisPool = await createRedisPool();

    const server: Bun.Server<WebsocketCtx> = Bun.serve({
      port: Server.port,
      async fetch(req, server) {
        const context = { serverLogger, redisPool };
        // public routes
        const pub = await publicHandler.handle(req, { context });
        if (pub.matched) return pub.response;

        // upgrade to websocket
        const redis = await redisPool.acquire();
        const isUpgraded = server.upgrade(req, {
          data: { ...context, openedAt: Date.now(), redis },
        });
        if (!isUpgraded) {
          await redisPool.release(redis);
          return new Response("Invalid WebSocket request", { status: 500 });
        }
      },
      websocket: {
        async message(ws, message) {
          await workerHandler.message(ws, message, {
            context: {
              ...ws.data,
            },
          });
        },
        async close(ws) {
          await redisPool.release(ws.data.redis);
          const closedAt = Date.now();
          const connTimeMs = closedAt - ws.data.openedAt;
          serverLogger.debug(`Websocket closed after ${String(connTimeMs)}ms`);
          workerHandler.close(ws);
        },
      },
    });

    return new Server(server, serverLogger);
  };

  destroy = async () => {
    try {
      await this.server.stop(true);
      // re-evaluate: maybe have this own the redis pool?
      // await redisPool.drain().then(() => redisPool.clear());
    } catch (error) {
      const msg = error instanceof Error ? error.message : "N/A";
      this.serverLogger.error({ msg }, "Error destroying server instance");
    }
  };

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}
