import { join } from "node:path";
import type { VmConfig } from "./utils";
import { VM } from "./vm/vm";

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

const vm0 = await VM.create("vm0", conf);

await Bun.sleep(10000);
