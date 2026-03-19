import * as z from "zod";
import { vmRoute } from "../orpc";
import { zJobResolved, zJobResult, zJobStatus } from "../schemas";
import { consumeJob, submitJobResult, submitJobStatus } from "../typed-redis";

export const vm = {
  requestJob: vmRoute
    .output(zJobResolved.nullable())
    .handler(async ({ context }) => {
      const { redis } = context;

      const data = await consumeJob(redis, 0);
      return data;
    }),
  submitJobStatus: vmRoute
    .input(zJobStatus)
    .handler(async ({ input, context }) => {
      if (input.status === "completed" || input.status === "timed-out") {
        throw new Error("do not send these (todo: add better type)");
      }

      const { redis } = context;
      await submitJobStatus(redis, input);
    }),
  submitJobResult: vmRoute
    .input(zJobResult)
    .output(
      z.object({
        action: z.enum(["continue", "die"]),
      }),
    )
    .handler(async ({ input, context }) => {
      const { redis } = context;
      await submitJobResult(redis, input);

      return {
        action: "continue",
      };
    }),
};

export type AppRouter = typeof vm;
