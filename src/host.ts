import Redis from "ioredis";
import { createInterface } from "node:readline";
import { baseLogger } from "./lib/logger";
import { tryCatch } from "./lib/utils";
import { judgeClient } from "./server/client";
import { Server } from "./server/server";
import { createVmPool } from "./vm/orchestrator";

const logger = baseLogger.child({}, { msgPrefix: "[HOST] " });

const redis = new Redis();
await redis.flushall();
logger.info("Started & Flushed redis");

const orchestrator = await createVmPool();
logger.info("Created VM pool");

const rl = createInterface({
  input: process.stdin,
});
logger.info("Created stdin interface");

await using server = await Server.create();
await Bun.sleep(100);

const { promise: isDeadPromise, resolve } = Promise.withResolvers();

const cleanup = async () => {
  logger.info("Cleaning up index.ts redis connection");
  redis.disconnect();
  logger.info("Closing file descriptors");
  rl.close();
  logger.info("Closing VM pool");
  await orchestrator.drain();
  await orchestrator.clear();
  logger.info("Host cleanup has completed");
  resolve();
};

logger.info("Ready to accept commands...");

// eslint-disable-next-line @typescript-eslint/no-misused-promises
rl.on("line", async (line) => {
  const segments = line
    .trim()
    .split(" ")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // prints
  console.log("console.log:", segments);
  logger.info("still works?");

  if (segments.length === 0) {
    return;
  }

  if (segments[0] === "exit") {
    await cleanup();
  } else if (segments[0] === "submit") {
    const txt = segments.slice(1).join(" ").trim();
    if (!txt) {
      logger.error("Must specify text for job submission");
    }

    const vm = await orchestrator.acquire();
    const file = new File([txt], "submission.cpp");
    const { data: iter, error } = await tryCatch(
      judgeClient.submit({ lang: "cpp", file }),
    );
    if (error) {
      logger.error(error, "failed to submit");
      return;
    }

    for await (const val of iter) {
      console.log("--------");
      console.log(JSON.stringify(val, null, 2));
      console.log("--------");
    }
    await orchestrator.release(vm);
  } else if (segments[0] === "view") {
    const res = await redis.lrange("script", 0, -1);
    logger.info({ res }, "View Result");
  } else {
    logger.warn({ segments }, "Unknown command");
  }
});

process.on("SIGINT", () => void cleanup());
await isDeadPromise;
