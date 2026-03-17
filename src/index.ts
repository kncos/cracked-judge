import Redis from "ioredis";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { logger } from "./lib/logger";
import { HostServer } from "./orpc/server";
import type { VmConfig } from "./vm";
import { VmOrchestrator } from "./vm/orchestrator";

const vmroot = "/tmp/vmroot";

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

await using server = HostServer.create();

await using pool = new VmOrchestrator(conf);
for (let i = 0; i < 3; i++) {
  const id = await pool.spawnVm(`vm${String(i)}`);
  logger.info(`Spawned VM with id ${id}`);
}

const rl = createInterface({
  input: process.stdin,
});

// out here
const cleanup = async () => {
  logger.info("Cleaning up index.ts redis connection");
  await redis.quit();
  logger.info("Destroying host server");
  await server.destroy();
  logger.info("Closing file descriptors");
  rl.close();
  logger.info("Graceful Shutdown: Goodbye");
};

const redis = new Redis();
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
  } else if (segments[0] === "script" && segments[1]) {
    await redis.lpush("script", segments[1]);
  } else if (segments[0] === "view") {
    const res = await redis.lrange("script", 0, -1);
    console.log(res);
  }
}

// process.on("SIGINT", cleanup);
