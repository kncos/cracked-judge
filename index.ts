import { createVm } from "./src/vm-sockets";

const { destroy } = await createVm("vm0");

await Bun.sleep(20000);

await destroy();
