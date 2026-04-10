import { readFileSync } from "fs";
import Redis from "ioredis";
import { parseArgs } from "util";
import z from "zod";
import { manualWhich } from "./lib/file-system/utils";
import { CrackedError } from "./lib/judge-error";
import { baseLogger } from "./lib/logger";
import { tryCatch } from "./lib/utils";
import { judgeClient } from "./server/client";
import { Server } from "./server/server";
import { zHostConfig } from "./vm/config";
import { HostFilesystem } from "./vm/fs-prep";
import { createVmPool } from "./vm/orchestrator";

const TOTAL_JOBS = 5;
const TIMEOUT_MS = 60_000;

const main = async (config: z.infer<typeof zHostConfig>) => {
  const logger = baseLogger.child({}, { msgPrefix: "[HOST] " });

  const redis = new Redis();
  await redis.flushall();
  logger.info("Started & Flushed redis");

  // this validates the config and copies the deps into their
  // expected location
  using _hostFs = new HostFilesystem(config);

  const orchestrator = await createVmPool(config);
  console.log("GOT HERE");
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

  // const timeout = new Promise<void>((resolve) => {
  //   setTimeout(() => {
  //     logger.warn("60s timeout reached, shutting down");
  //     resolve();
  //   }, TIMEOUT_MS);
  // });

  const runJobs = async () => {
    for (let n = 1; n <= 1; n++) {
      const txt = `job ${n}`;
      console.log(`Submitting: "${txt}"`);

      const vm = await orchestrator.acquire();
      const file = new File([txt], "submission.cpp");
      const { data: iter, error } = await tryCatch(
        judgeClient.submit({ lang: "cpp", file }),
      );

      if (error) {
        console.log(`error: failed to submit job ${n}: ${error}`);
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
      console.log(`completed job ${n}/${TOTAL_JOBS}`);
      logger.info(`Completed job ${n}/${TOTAL_JOBS}`);
    }

    logger.info("All jobs completed");
  };

  await runJobs();
  const ac = new AbortController();
  process.on("SIGINT", () => {
    ac.abort();
  });
  await new Promise((res) => {
    ac.signal.addEventListener("abort", res, { once: true });
  });

  await cleanup();
};

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    config: {
      type: "string",
      short: "c",
      multiple: false,
    },
  },
  strict: true,
  allowPositionals: true,
});

const confPath =
  values.config || manualWhich("host-config.json", [".", "/etc/crackedjudge"]);

if (confPath !== null) {
  const conf = readFileSync(confPath, "utf-8");
  const parsedConf = zHostConfig.parse(JSON.parse(conf));
  void main(parsedConf);
} else {
  throw new CrackedError("CONFIG_ERROR", {
    message:
      "No config path provided with --config, and no host-config.json found",
  });
}
