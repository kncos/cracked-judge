import Redis from "ioredis";
import { readFileSync } from "node:fs";
import { parseArgs } from "util";
import z from "zod";
import { baseLogger } from "./lib/logger";
import { tryCatch } from "./lib/utils";
import { judgeClient } from "./server/client";
import { Server } from "./server/server";
import { createVmPool } from "./vm/orchestrator";

const TOTAL_JOBS = 5;
const TIMEOUT_MS = 60_000;

const zConfig = z.object({});

const main = async (config?: z.infer<typeof zConfig>) => {
  const logger = baseLogger.child({}, { msgPrefix: "[HOST] " });

  if (config) {
    logger.info({ config }, "Loaded config");
  } else {
    logger.info("No config provided");
  }

  const redis = new Redis();
  await redis.flushall();
  logger.info("Started & Flushed redis");

  const orchestrator = await createVmPool();
  logger.info("Created VM pool");

  await using _server = await Server.create();
  await Bun.sleep(100);

  const cleanup = async () => {
    logger.info("Cleaning up index.ts redis connection");
    redis.disconnect();
    logger.info("Closing VM pool");
    await orchestrator.drain();
    await orchestrator.clear();
    logger.info("Host cleanup has completed");
  };

  logger.info("Starting job submissions...");

  const timeout = new Promise<void>((resolve) => {
    setTimeout(() => {
      logger.warn("60s timeout reached, shutting down");
      resolve();
    }, TIMEOUT_MS);
  });

  const runJobs = async () => {
    for (let n = 1; n <= TOTAL_JOBS; n++) {
      const txt = `job ${n}`;
      logger.info(`Submitting: "${txt}"`);

      const vm = await orchestrator.acquire();
      const file = new File([txt], "submission.cpp");
      const { data: iter, error } = await tryCatch(
        judgeClient.submit({ lang: "cpp", file }),
      );

      if (error) {
        logger.error(error, `Failed to submit job ${n}`);
        await orchestrator.release(vm);
        continue;
      }

      for await (const val of iter) {
        console.log("--------");
        console.log(JSON.stringify(val, null, 2));
        console.log("--------");
      }

      await orchestrator.release(vm);
      logger.info(`Completed job ${n}/${TOTAL_JOBS}`);
    }

    logger.info("All jobs completed");
  };

  await Promise.race([runJobs(), timeout]);

  await cleanup();
};

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    config: {
      type: "string",
    },
  },
  strict: true,
});

const { config } = values;
if (config) {
  const parsedConfig = zConfig.parse(JSON.parse(readFileSync(config, "utf-8")));
  void main(parsedConfig);
} else {
  void main();
}
