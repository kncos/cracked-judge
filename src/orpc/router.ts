import { os } from "@orpc/server";
import * as z from "zod";
import { tryCatch } from "../lib/utils";
import type { ServerContext } from "./server";

const vmRoute = os
  .$context<ServerContext>()
  .use(async ({ next, context, path }) => {
    const { serverLogger } = context;

    const start = Date.now();
    const result = await next();
    const end = Date.now();
    serverLogger.info(
      {
        timeMs: end - start,
        endpoint: path.join("/"),
        redisKey: context.redisKey,
      },
      "Request Timer",
    );
    return result;
  });

const i = 0;
export const router = {
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
      serverLogger.info(input, "Received a job submission");

      return {
        action: "continue",
      };
    }),
};

export type AppRouter = typeof router;
