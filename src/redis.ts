import { Redis } from "ioredis";
import { createInterface } from "node:readline";
import { logger } from "./lib/logger";

const worker = async (id: string) => {
  const wredis = new Redis();
  const wlogger = logger.child({ worker: id });
  while (true) {
    try {
      const result = await wredis.brpop("task_queue", 0);
      if (result) {
        const [queueName, taskData] = result;
        wlogger.info({ queueName, taskData }, "Worker accepted job");
        // slow them down
        await Bun.sleep(3000);
        wlogger.info({ queueName, taskData }, "Worker finished job");
      }
    } catch (e) {
      wlogger.error({ e }, "Worker error");
      await Bun.sleep(1000);
    }
  }
};

worker("1");
worker("2");
worker("3");

const rl = createInterface({
  input: process.stdin,
});

const redis = new Redis();
for await (const line of rl) {
  const input = line.trim();
  if (input === "exit") {
    rl.close();
    process.exit(0);
  } else if (input === "view") {
    logger.info("Fetching all redis tasks...");
    const allTasks = await Promise.race([
      redis.lrange("task_queue", 0, -1),
      Bun.sleep(3000).then(() => {
        return "TIMEOUT";
      }),
    ]);
    if (allTasks === "TIMEOUT") {
      logger.error("Fetching redis tasks timed out");
    } else {
      logger.info({ allTasks }, "Fetched all redis tasks");
    }
  } else if (input.length > 0) {
    logger.info({ task: input }, "Pushing new task to reids");
    const result = await Promise.race([
      redis.lpush("task_queue", input),
      Bun.sleep(3000).then(() => {
        return "TIMEOUT";
      }),
    ]);
    if (result === "TIMEOUT") {
      logger.error({ task: input }, "Pushing redis task timed out");
    } else {
      logger.info({ task: input }, "inserted redis tasks");
    }
  }
}
