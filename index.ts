import { createVm } from "./src/vm-sockets";

const { destroy } = await createVm("vm0");

Bun.sleep(8000);

await destroy();
