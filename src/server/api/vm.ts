import { ORPCError } from "@orpc/client";
import { writeFileSync } from "fs";
import * as z from "zod";
import { vmRoute } from "../orpc";
import { zJob, zJobResult, zJobStatus } from "../schemas";

export const vm = {
  requestJob: vmRoute.output(zJob.nullable()).handler(async ({ context }) => {
    const { redisManager } = context;
    const data = await redisManager.consumeJob(0);
    return data;
  }),
  submitJobStatus: vmRoute
    .input(zJobStatus)
    .handler(async ({ input, context }) => {
      const { redisManager } = context;
      if (input.status === "completed" || input.status === "timed-out") {
        throw new ORPCError("BAD_REQUEST", { message: "Do not send these" });
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

      const prettyPrint = {
        ...input,
        stdout: input.stdout.slice(0, 512),
        stderr: input.stderr.slice(0, 512),
      };

      serverLogger.info(prettyPrint, "Received a job result");
      writeFileSync("/tmp/jobout.txt", input.stdout);
      writeFileSync("/tmp/joberr.txt", input.stderr);

      return {
        action: "continue",
      };
    }),
};

export type AppRouter = typeof vm;
