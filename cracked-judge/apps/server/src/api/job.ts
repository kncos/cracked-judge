import { nanoid } from "nanoid";
import { route } from "../orpc";

export const job = route.job.router({
  submit: route.job.submit.handler(async ({ input, context }) => {
    const { redisManager } = context;
    const id = nanoid();
    await redisManager.enqueueJob({
      ...input,
      id,
    });

    const res = await redisManager.awaitJobResult({
      jobId: id,
      timeout: 30,
    });

    return res;
  }),
  get: route.job.get.handler(async ({ input, context }) => {
    //
    return null;
  }),
  test: route.job.test.handler(() => ({ ok: true })),
});
