import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/bun-ws";
import { logger } from "../lib/logger";
import { router, type VmContext } from "./router";

export const createHostServer = () => {
  const serverLogger = logger.child({}, { msgPrefix: "[Host Server] " });
  const handler = new RPCHandler(router, {
    interceptors: [
      onError((error) => {
        serverLogger.error(error, "RPC Error occurred");
      }),
      ({ request, next }) => {
        request.signal?.addEventListener("abort", () => {
          serverLogger.info(
            { url: request.url, method: request.method },
            "Request aborted",
          );
        });

        return next();
      },
    ],
  });

  const server: Bun.Server<VmContext> = Bun.serve({
    port: 3000,
    fetch(req, server) {
      const vmId = req.headers.get("VMID") || "anonymous";

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
