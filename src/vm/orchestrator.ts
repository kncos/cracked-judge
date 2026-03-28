import { baseLogger } from "@/lib/logger";
import genericPool from "generic-pool";
import { createVm } from "./vm";

type VM = Awaited<ReturnType<typeof createVm>>;

const logger = baseLogger.child({}, { msgPrefix: "[VM POOL] " });

export const vmPoolFactory: genericPool.Factory<VM> = {
  create: async function () {
    logger.debug("VM POOL: Create started");
    const vm = await createVm({ vmRoot: "/tmp/vmroot" });
    logger.debug("VM POOL: Create finished");
    return vm;
  },
  destroy: async function (vm) {
    logger.debug("VM POOL: Destroy started");
    await vm[Symbol.asyncDispose]();
    logger.debug("VM POOL: Destroy finished");
  },
  validate: async function (vm) {
    logger.debug("VM POOL: Validate started");
    const valid = await Promise.resolve(!vm.isDestroyed);
    logger.debug("VM POOL: Validate finished");
    return valid;
  },
};

export const createVmPool = async () => {
  const pool = genericPool.createPool(vmPoolFactory, {
    testOnBorrow: true,
    testOnReturn: true,
    min: 0,
    max: 32,
  });
  await pool.ready();
  return pool;
};
