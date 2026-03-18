import { RedisRegistry } from "@/lib/redis-registry";
import { tryCatch } from "@/lib/utils";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/bun-ws";
import type { Logger } from "pino";
import { logger } from "../../lib/logger";
import type { ServerCtx } from "../orpc";
import { vmRouter } from "./router";

export class VmServer implements AsyncDisposable {
  private static port: number = 3000;
  private constructor(
    private readonly server: Bun.Server<ServerCtx>,
    private readonly redisRegistry: RedisRegistry,
    private readonly serverLogger: Logger,
  ) {}

  static create = (name: string = "Server") => {
    const registry = new RedisRegistry();
    const serverLogger = logger.child({}, { msgPrefix: `[${name}] ` });
    const handler = new RPCHandler<ServerCtx>(vmRouter, {
      interceptors: [
        onError((error) => {
          serverLogger.error(error, "RPC Error occurred");
        }),
      ],
    });

    const server: Bun.Server<ServerCtx> = Bun.serve({
      port: VmServer.port,
      async fetch(req, server) {
        const { data: redisKey, error } = await tryCatch(registry.allocate());
        if (error) {
          const msg = `Upgrade failed: Redis connection could not be allocated.`;
          serverLogger.error({ redisKey, errorMsg: error.message }, msg);
          return new Response(msg, { status: 500 });
        }

        const redis = registry.get(redisKey);
        if (redis === undefined) {
          const msg = `Redis connection not found for key: ${redisKey}`;
          serverLogger.error({ redisKey }, msg);
          return new Response(msg, { status: 500 });
        }

        if (
          server.upgrade(req, {
            data: { redisKey, redis, serverLogger, openedAt: Date.now() },
          })
        ) {
          return;
        }
        return new Response("Upgrade failed", { status: 500 });
      },
      websocket: {
        async message(ws, message) {
          await handler.message(ws, message, {
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

          handler.close(ws);
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
