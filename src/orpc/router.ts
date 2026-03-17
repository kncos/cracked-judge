import { os } from "@orpc/server";
import Redis from "ioredis";
import * as z from "zod";
import { logger } from "../lib/logger";
import { tryCatch } from "../lib/utils";

export type VmContext = {
  vmId: string;
};

const vmRoute = os
  .$context<VmContext>()
  .use(async ({ next, context, ...rest }) => {
    logger
      .child(
        {
          ...context,
          path: rest.path.join("/"),
        },
        { msgPrefix: "[Host Server] " },
      )
      .info("Received a request");

    return await next();
  })
  .use(async ({ next, context, ...rest }) => {
    return await next({
      context: {
        ...context,
        vmLogger: logger.child(
          { vmId: context.vmId },
          { msgPrefix: "[VM Request Ctx]" },
        ),
      },
    });
  });

let i = 0;

//TODO: this doesn't dispose when conn is aborted, add registry
class DisposableRedis extends Redis {
  async [Symbol.asyncDispose]() {
    await this.quit();
  }
}

export const router = {
  requestJob: vmRoute
    .output(
      z.object({
        script: z.string(),
        jobType: z.enum(["script"]),
      }),
    )
    .handler(async ({ context }) => {
      await using redis = new DisposableRedis();
      // for now we just assume data is a basic string w/ no chars that need escaped
      const { data, error } = await tryCatch(redis.brpop("script", 0));
      if (error) {
        context.vmLogger.error("Failed to brpop from redis!");
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
      context.vmLogger.info({ ...input }, "Received new job submission");
      return {
        action: "continue",
      };
    }),
};

export type AppRouter = typeof router;
