import { publicRoute } from "../orpc";

export const vm = {
  submit: publicRoute.worker.submit.handler(async ({ input, context }) => {
    await context.redisManager.enqueueJobResult(input);
  }),
  request: publicRoute.worker.request.handler(async ({ context }) => {
    const res = await context.redisManager.dequeueJob();
    return res;
  }),
};

export type AppRouter = typeof vm;
