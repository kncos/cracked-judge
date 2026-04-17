import { CrackedError } from "@cracked-judge/common";
import { onError } from "@orpc/client";
import { RPCHandler as RPCHandlerWs } from "@orpc/server/bun-ws";
import { RPCHandler } from "@orpc/server/fetch";
import { user } from "./api";
import { worker } from "./api/worker";
import { serverLogger } from "./lib/logger";
import { type BaseCtx, type WebsocketCtx } from "./orpc";
import { RedisManager } from "./typed-redis";

const createHandlers = () => {
  const workerHandler = new RPCHandlerWs<WebsocketCtx>(worker, {
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

  const publicHandler = new RPCHandler<BaseCtx>(user, {
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

    return new Server(server, redisManager);
  };

  destroy = async () => {
    const delayMs = 5000;
    const timer = setTimeout(() => {
      serverLogger.warn(`cleanup still ongoing after ${delayMs}ms`);
    }, delayMs);

    try {
      await this.server.stop();
      await this.redisManager.destroy();
    } catch (e) {
      const msg =
        e instanceof CrackedError
          ? e.prettyString
          : ((e as Error)?.message ?? String(e));
      serverLogger.error(`Encountered exception during cleanup: ${msg}`);
      throw new CrackedError("RESOURCE_DISPOSAL", {
        message: "Encountered exception during server cleanup",
        cause: e,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}
