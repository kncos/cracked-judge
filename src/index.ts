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

for await (const line of rl) {
  if (line.trim() === "exit") {
    rl.close();
    break;
  }
}
