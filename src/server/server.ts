import { baseLogger } from "@/lib/logger";
import { onError } from "@orpc/client";
import { RPCHandler as RPCHandlerWs } from "@orpc/server/bun-ws";
import { RPCHandler } from "@orpc/server/fetch";
import type { Logger } from "pino";
import { judge } from "./api/judge";
import { vm } from "./api/vm";
import { type BaseCtx, type WebsocketCtx } from "./orpc";
import { RedisManager } from "./typed-redis";

const serverLogger = baseLogger.child({}, { msgPrefix: "[server] " });
const createHandlers = () => {
  const workerHandler = new RPCHandlerWs<WebsocketCtx>(vm, {
    filter: ({ contract }) => {
      if (contract["~orpc"].route.tags?.includes("public")) return false;
      return true;
    },
    interceptors: [
      onError((error) => {
        serverLogger.error({ comment: "interceptor" }, String(error));
      }),
    ],
  });

  const publicHandler = new RPCHandler<BaseCtx>(judge, {
    // disallow public routes from matching worker routes
    filter: ({ contract }) => {
      if (contract["~orpc"].route.tags?.includes("worker")) return false;
      return true;
    },
    interceptors: [
      onError((error) => {
        serverLogger.error({ comment: "interceptor" }, String(error));
      }),
    ],
  });

  return { workerHandler, publicHandler };
};

export class Server implements AsyncDisposable {
  private static port: number = 3000;
  private constructor(
    private readonly server: Bun.Server<WebsocketCtx>,
    private readonly serverLogger: Logger,
    private readonly redisManager: RedisManager,
  ) {}

  static create = async () => {
    // handlers
    const { workerHandler, publicHandler } = createHandlers();
    // redisPool, serverLogger
    const redisManager = await RedisManager.create();

    const server: Bun.Server<WebsocketCtx> = Bun.serve({
      port: Server.port,
      async fetch(req, server) {
        const context = { serverLogger, redisManager };
        // public routes
        const pub = await publicHandler.handle(req, { context });
        if (pub.matched) return pub.response;

        // upgrade to websocket
        const isUpgraded = server.upgrade(req, {
          data: { ...context, openedAt: Date.now() },
        });
        if (!isUpgraded) {
          serverLogger.error("WS upgrade failed");
          return new Response("Invalid WebSocket request", { status: 500 });
        } else {
          serverLogger.info("WS upgrade succeeded");
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
        open() {
          serverLogger.debug("Websocket connection opened");
        },
        close(ws, code, reason) {
          const closedAt = Date.now();
          const connTimeMs = closedAt - ws.data.openedAt;
          serverLogger.debug(
            { code, reason },
            `Websocket closed after ${String(connTimeMs)}ms`,
          );
          // is this necessary
          workerHandler.close(ws);
        },
      },
    });

    return new Server(server, serverLogger, redisManager);
  };

  destroy = async () => {
    try {
      await this.server.stop(true);
      await this.redisManager.destoy();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "N/A";
      this.serverLogger.error({ msg }, "Error destroying server instance");
    }
  };

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}
