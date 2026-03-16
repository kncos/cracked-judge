import { os } from "@orpc/server";
import Redis from "ioredis";
import * as z from "zod";
import { logger } from "./lib/logger";
import { tryCatch } from "./lib/utils";

export interface VmContext {
  vmId: string;
}

const vmRoute = os.$context<VmContext>();
let i = 0;

export const router = {
  requestJob: vmRoute
    .input(z.never())
    .output(
      z.object({
        script: z.string(),
        jobType: z.enum(["script"]),
      }),
    )
    .handler(async ({ context }) => {
      const redis = new Redis();
      // for now we just assume data is a basic string w/ no chars that need escaped
      const { data, error } = await tryCatch(redis.brpop("script", 0));
      if (error) {
        logger.error({ ...context }, "Failed to brpop from redis!");
      }

      return {
        jobType: "script",
        script: `/bin/sh -c 'echo "Hello from guest ${i}: ${data || "redis error"}"'`,
      };
    }),
  submitJob: vmRoute
    .input(
      z.object({
        stdin: z.string(),
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
      logger.info({ ...context, ...input }, "Received new job submission");
      return {
        action: "die",
      };
    }),
};

export type AppRouter = typeof router;
