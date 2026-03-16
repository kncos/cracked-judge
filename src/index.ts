import Redis from "ioredis";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { logger } from "./lib/logger";
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

await using pool = new VmOrchestrator(conf);
for (let i = 0; i < 1; i++) {
  const id = await pool.spawnVm(`vm${i}`);
  logger.info(`Spawned VM with id ${id}`);
}

const rl = createInterface({
  input: process.stdin,
});

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
    rl.close();
    break;
  } else if (segments[0] === "script" && segments?.[1]) {
    await redis.lpush("script", segments[1]);
  } else if (segments[0] === "view") {
    const res = await redis.lrange("script", 0, -1);
    console.log(res);
  }
}
