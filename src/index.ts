import { join } from "node:path";
import type { VmConfig } from "./vm";
import { VmOrchestrator } from "./vm/orchestrator";

const vmroot = "/tmp/vmroot";

const conf: VmConfig = {
  jail: join(vmroot, "jail"),
  base: join(vmroot, "base"),
  socks: join(vmroot, "socks"),
  workspace: join(vmroot, "workspace"),
  uid: "60000",
  gid: "60000",
  firecrackerBinary: join(vmroot, "firecracker"),
  jailerBinary: join(vmroot, "jailer"),
};

await using pool = new VmOrchestrator(conf);
for (let i = 0; i < 16; i++) {
  const id = await pool.spawnVm();
  console.log(`Spawned VM with ID: ${id}`);
}

await Bun.sleep(10000);
