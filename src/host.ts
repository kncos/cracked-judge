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

const vm0 = await orchestrator.acquire();
const vm1 = await orchestrator.acquire();
const vm2 = await orchestrator.acquire();

const cleanup = async () => {
  await orchestrator.destroy(vm0);
  await orchestrator.destroy(vm1);
  await orchestrator.destroy(vm2);

  logger.info("Cleaning up index.ts redis connection");
  redis.disconnect();
  logger.info("Closing file descriptors");
  rl.close();
  logger.info("Closing VM pool");
  await orchestrator.drain();
  await orchestrator.clear();
  logger.info("Host cleanup has completed");
};

logger.info("Ready to accept commands...");

for await (const line of rl) {
  const segments = line
    .trim()
    .split(" ")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // prints
  console.log("console.log:", segments);
  logger.info("still works?");

  if (segments.length === 0) {
    continue;
  }

  if (segments[0] === "exit") {
    await cleanup();
    break;
  } else if (segments[0] === "submit") {
    await Bun.sleep(0.1);
    const txt = segments.slice(1).join(" ").trim();
    if (!txt) {
      logger.error("Must specify text for job submission");
    }

    const file = new File([txt], "submission.cpp");
    const { data: iter, error } = await tryCatch(
      judgeClient.submit({ lang: "cpp", file }),
    );
    if (error) {
      logger.error(error, "failed to submit");
      continue;
    }

    for await (const val of iter) {
      console.log("--------");
      console.log(JSON.stringify(val, null, 2));
      console.log("--------");
    }
  } else if (segments[0] === "view") {
    const res = await redis.lrange("script", 0, -1);
    logger.info({ res }, "View Result");
  } else {
    logger.warn({ segments }, "Unknown command");
  }
}

void Bun.sleep(5000).then(() => {
  console.log(process.getActiveResourcesInfo());
});
