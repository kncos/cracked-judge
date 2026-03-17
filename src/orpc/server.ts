import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/bun-ws";
import { logger } from "../lib/logger";
import { router, type VmContext } from "./router";

export const createHostServer = (params: {
  socketPath: string;
  vmId: string;
}) => {
  const { socketPath, vmId } = params;
  const serverLogger = logger.child(
    { vmId, socketPath },
    { msgPrefix: "[Host Server] " },
  );
  const handler = new RPCHandler(router, {
    interceptors: [
      onError((error) => {
        serverLogger.error(error, "RPC Error occurred");
      }),
    ],
  });

  const server: Bun.Server<VmContext> = Bun.serve({
    port: 3000,
    fetch(req, server) {
      serverLogger.info("received fetch request");

      if (server.upgrade(req, { data: { vmId } })) {
        return;
      }

      return new Response("Upgrade failed", { status: 500 });
    },
    websocket: {
      message(ws, message) {
        handler.message(ws, message, {
          context: { vmId: ws.data.vmId },
        });
      },
      close(ws) {
        handler.close(ws);
        serverLogger.trace("WebSocket connection closed");
      },
      open(ws) {
        serverLogger.trace("WebSocket connection opened");
      },
    },
  });
  return server;
};
