import * as z from "zod";
import { tryCatch } from "../../lib/utils";
import { vmRoute } from "../orpc";

const i = 0;
export const vmRouter = {
  requestJob: vmRoute
    .output(
      z.object({
        script: z.string(),
        jobType: z.enum(["script"]),
      }),
    )
    .handler(async ({ context }) => {
      const { redis, serverLogger } = context;

      // for now we just assume data is a basic string w/ no chars that need escaped
      const { data, error } = await tryCatch(redis.brpop("script", 0));

      if (error) {
        serverLogger.error("Failed to brpop from redis!");
      }

      return {
        jobType: "script",
        script: `/bin/sh -c 'echo "Hello from guest ${String(i)}: ${data?.join(" ") || "redis error"}"'`,
      };
    }),
  submitJob: vmRoute
    .input(
      z.object({
        stderr: z.string(),
        stdout: z.string(),
        exitCode: z.number(),
      }),
    )
    .output(
      z.object({
        action: z.enum(["continue", "die"]),
      }),
    )
    .handler(({ input, context }) => {
      const { serverLogger } = context;
      serverLogger.info(
        `Received a job submission. Exit code was ${String(input.exitCode)}`,
      );

      return {
        action: "continue",
      };
    }),
};

export type AppRouter = typeof vmRouter;
