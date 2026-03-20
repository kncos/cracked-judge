import * as z from "zod";
import { vmRoute } from "../orpc";
import { zJob, zJobResult, zJobStatus } from "../schemas";

export const vm = {
  requestJob: vmRoute.output(zJob.nullable()).handler(async ({ context }) => {
    const { redisManager } = context;
    const data = await redisManager.consumeJob(0);
    if (data === null) return null;

    return {
      ...data,
      file: new File([data.file], "hello"),
    };
  }),
  submitJobStatus: vmRoute
    .input(zJobStatus)
    .handler(async ({ input, context }) => {
      const { redisManager } = context;
      if (input.status === "completed" || input.status === "timed-out") {
        throw new Error("do not send these (todo: add better type)");
      }

      await redisManager.submitJobStatus(input);
    }),
  submitJobResult: vmRoute
    .input(zJobResult)
    .output(
      z.object({
        action: z.enum(["continue", "die"]),
      }),
    )
    .handler(async ({ input, context }) => {
      const { redisManager, serverLogger } = context;
      await redisManager.submitJobResult(input);
      // submit completed status to pub/sub stream
      await redisManager.submitJobStatus({
        status: "completed",
        type: "status",
        id: input.id,
      });

      serverLogger.info(input, "Received a job result");

      return {
        action: "continue",
      };
    }),
};

export type AppRouter = typeof vm;
