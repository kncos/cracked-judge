import { RPCLink } from "@orpc/client/websocket";
import { os } from "@orpc/server";
import { logger } from "./lib/logger";

// declare global {
//   var $client: RouterClient<AppRouter> | undefined;
// }

const link = new RPCLink({
  websocket: new WebSocket("ws://localhost:3000"),
});

export const createRPCContext = (opts?: { vmId: string }) => {
  return {
    ...opts,
    vmId: opts?.vmId || "anonymous",
  };
};

export type RPCContextType = ReturnType<typeof createRPCContext>;

const o = os.$context<RPCContextType>();

const timingMiddleware = o.middleware(async ({ next, path }) => {
  const start = Date.now();
  const result = await next();
  const end = Date.now();
  logger.debug({ timeMs: end - start, path }, "Timing result");
  return result;
});

const vmProcedure = o.use(timingMiddleware);
