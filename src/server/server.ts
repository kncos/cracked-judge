import { tryCatch } from "@/lib/utils";
import { onError } from "@orpc/server";
import { RPCHandler as RPCHandlerWs } from "@orpc/server/bun-ws";
import { RPCHandler } from "@orpc/server/fetch";
import type { Logger } from "pino";
import { baseLogger } from "../lib/logger";
import { judge } from "./api/judge";
import { vm } from "./api/vm";
import type { ServerCtx } from "./orpc";

const fetch: Parameters<typeof Bun.serve>[0]["fetch"] = (req, server) => {
  // vm path (websockets)
  // public path (judge api)
};

export class VmServer implements AsyncDisposable {
  private static port: number = 3000;
  private constructor(
    private readonly server: Bun.Server<ServerCtx>,
    private readonly serverLogger: Logger,
  ) {}

  static create = (name: string = "Server") => {
    const serverLogger = baseLogger.child({}, { msgPrefix: `[${name}] ` });
    const vmHandler = new RPCHandlerWs<ServerCtx>(vm, {
      interceptors: [
        onError((error) => {
          serverLogger.error(error, "RPC Error occurred");
        }),
      ],
    });

    //todo: finish implementing this handler
    const judgeHandler = new RPCHandler<ServerCtx>(judge, {
      interceptors: [
        onError((error) => {
          serverLogger.error(error, "RPC Error occurred");
        }),
      ],
    });

    const server: Bun.Server<ServerCtx> = Bun.serve({
      port: VmServer.port,
      // eslint-disable-next-line @typescript-eslint/require-await
      async fetch(req, server) {
        if (
          server.upgrade(req, {
            data: { serverLogger, openedAt: Date.now() },
          })
        ) {
          return;
        }
        return new Response("Upgrade failed", { status: 500 });
      },
      websocket: {
        async message(ws, message) {
          await vmHandler.message(ws, message, {
            context: {
              ...ws.data,
            },
          });
        },
        async close(ws) {
          const { error } = await tryCatch(
            registry.deallocate(ws.data.redisKey),
          );
          if (error) {
            const msg = "Error when deallocating redis key during socket close";
            serverLogger.error({ message: error.message }, msg);
          }
          const closedAt = Date.now();
          const connTimeMs = closedAt - ws.data.openedAt;
          serverLogger.debug(`Websocket closed after ${String(connTimeMs)}ms`);

          vmHandler.close(ws);
        },
      },
    });

    return new VmServer(server, registry, serverLogger);
  };

  destroy = async () => {
    try {
      await this.server.stop(true);
      await this.redisRegistry.destroy();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "N/A";
      this.serverLogger.error({ msg }, "Error destroying server instance");
    }
  };

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}
