import { serverLogger } from "../lib/logger";
import { vmRoute } from "../orpc";

export const worker = vmRoute.worker.router({
  submit: vmRoute.worker.submit.handler(async ({ input, context }) => {
    await context.redisManager.enqueueJobResult(input);
  }),
  request: vmRoute.worker.request.handler(async ({ input, context }) => {
    const { timeoutSec } = input;
    serverLogger.debug("WORKER: requesting job");
    const res = await context.redisManager.dequeueJob(timeoutSec ?? 30);
    return res;
  }),
  check: vmRoute.worker.check.handler(() => {
    return {
      message: "worker route",
      ok: true,
    };
  }),
});
