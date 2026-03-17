import { os } from "@orpc/server";
import Redis from "ioredis";
import * as z from "zod";
import { logger } from "../lib/logger";
import { tryCatch } from "../lib/utils";

const vmRoute = os
  .use(async ({ next, context, ...rest }) => {
    const reqLogger = logger.child(
      {
        ...context,
        path: rest.path.join("/"),
      },
      { msgPrefix: "[Request] " },
    );
    reqLogger.debug("Handling request: added logging middleware");

    return await next({
      context: {
        ...context,
        reqLogger,
      },
    });
  })
  .use(async ({ next, context, signal, ...rest }) => {
    const redis = new Redis();

    signal?.addEventListener("abort", () => {
      context.reqLogger.info("Request aborted, cleaning up redis...");
      // this is async but i think we can just send it out into the void
      redis.quit();
    });

    return await next({
      context: {
        ...context,
        redis,
      },
    });
  });

let i = 0;
export const router = {
  requestJob: vmRoute
    .output(
      z.object({
        script: z.string(),
        jobType: z.enum(["script"]),
      }),
    )
    .handler(async ({ context }) => {
      const { redis, reqLogger } = context;

      // for now we just assume data is a basic string w/ no chars that need escaped
      const { data, error } = await tryCatch(redis.brpop("script", 0));

      if (error) {
        reqLogger.error("Failed to brpop from redis!");
      }

      return {
        jobType: "script",
        script: `/bin/sh -c 'echo "Hello from guest ${i}: ${data || "redis error"}"'`,
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
    .handler(async ({ input, context }) => {
      const { reqLogger } = context;
      reqLogger.info(input, "Received a job submission");

      return {
        action: "continue",
      };
    }),
};

export type AppRouter = typeof router;
