import genericPool from "generic-pool";
import { createVm } from "./vm";

type VM = Awaited<ReturnType<typeof createVm>>;

export const vmPoolFactory: genericPool.Factory<VM> = {
  create: async function () {
    const vm = await createVm({ vmRoot: "/tmp/vmroot" });
    return vm;
  },
  destroy: async function (vm) {
    await vm[Symbol.asyncDispose]();
  },
  validate: async function (vm) {
    return await Promise.resolve(!vm.isDestroyed);
  },
};

export const createVmPool = async () => {
  const pool = genericPool.createPool(vmPoolFactory);
  await pool.ready();
  return pool;
};
