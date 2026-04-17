import { publicRoute } from "../orpc";

export const worker = publicRoute.worker.router({
  submit: publicRoute.worker.submit.handler(async ({ input, context }) => {
    await context.redisManager.enqueueJobResult(input);
  }),
  request: publicRoute.worker.request.handler(async ({ context }) => {
    const res = await context.redisManager.dequeueJob();
    return res;
  }),
});
