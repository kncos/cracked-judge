import Redis from "ioredis";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { baseLogger } from "./lib/logger";
import { tryCatch } from "./lib/utils";
import { judgeClient } from "./server/client";
import type { VmConfig } from "./vm";
import { VmOrchestrator } from "./vm/orchestrator";

const vmroot = "/tmp/vmroot";
const redis = new Redis();
await redis.flushall();

const conf: VmConfig = {
  jail: join(vmroot, "jail"),
  base: join(vmroot, "base"),
  socks: join(vmroot, "run"),
  workspace: join(vmroot, "workspace"),
  uid: "60000",
  gid: "60000",
  firecrackerBinary: join(vmroot, "firecracker"),
  jailerBinary: join(vmroot, "jailer"),
};

await using orchestrator = await VmOrchestrator.create(conf);
for (let i = 0; i < 3; i++) {
  const id = await orchestrator.spawnVm(`vm${String(i)}`);
  baseLogger.info(`Spawned VM with id ${id}`);
}

const rl = createInterface({
  input: process.stdin,
});

// out here
const cleanup = async () => {
  baseLogger.info("Cleaning up index.ts redis connection");
  await redis.quit();
  baseLogger.info("Closing file descriptors");
  rl.close();
  baseLogger.info("Graceful Shutdown: Goodbye");
};

for await (const line of rl) {
  const segments = line
    .trim()
    .split(" ")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (segments.length === 0) {
    continue;
  }

  if (segments[0] === "exit") {
    await cleanup();
    break;
  } else if (segments[0] === "submit") {
    const txt = segments.slice(1).join(" ").trim();
    if (!txt) {
      baseLogger.error("Must specify text for job submission");
    }

    const file = new File([txt], "submission.cpp");
    const { data: iter, error } = await tryCatch(
      judgeClient.submit({ lang: "cpp", file }),
    );
    if (error) {
      baseLogger.error(error, "failed to submit");
      continue;
    }

    for await (const val of iter) {
      console.log("--------");
      console.log(JSON.stringify(val, null, 2));
      console.log("--------");
    }
  } else if (segments[0] === "view") {
    const res = await redis.lrange("script", 0, -1);
    console.log(res);
  }
}

// process.on("SIGINT", cleanup);
