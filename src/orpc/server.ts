import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/bun-ws";
import { logger } from "../lib/logger";
import { router } from "./router";

export const createHostServer = () => {
  const serverLogger = logger.child({}, { msgPrefix: "[Server] " });
  const handler = new RPCHandler(router, {
    interceptors: [
      onError((error) => {
        serverLogger.error(error, "RPC Error occurred");
      }),
    ],
  });

  const server = Bun.serve({
    port: 3000,
    fetch(req, server) {
      if (server.upgrade(req)) {
        return;
      }

      return new Response("Upgrade failed", { status: 500 });
    },
    websocket: {
      message(ws, message) {
        handler.message(ws, message);
      },
      close(ws) {
        handler.close(ws);
        serverLogger.trace("WebSocket connection closed");
      },
      open() {
        serverLogger.trace("WebSocket connection opened");
      },
    },
  });
  return server;
};
