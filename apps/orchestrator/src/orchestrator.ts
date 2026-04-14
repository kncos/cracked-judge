import { baseLogger } from "@/lib/logger";
import genericPool from "generic-pool";
import type { HostConfig } from "./config";
import { createVm } from "./vm";

type VM = Awaited<ReturnType<typeof createVm>>;

const logger = baseLogger.child({}, { msgPrefix: "[VM POOL] " });

export const createVmPool = async (config: HostConfig) => {
  const vmPoolFactory: genericPool.Factory<VM> = {
    create: async function () {
      logger.debug("VM POOL: Create started");
      const vm = await createVm({ config });
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

  const pool = genericPool.createPool(vmPoolFactory, {
    testOnBorrow: true,
    testOnReturn: true,
    min: 1,
    max: 32,
  });

  await pool.ready();
  return pool;
};
