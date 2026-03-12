import { createVm } from "./src/vm-sockets";

const { destroy: d1 } = await createVm("vm0");
const { destroy: d2 } = await createVm("vm1");

await Bun.sleep(20000);

await Promise.all([d1(), d2()]);
