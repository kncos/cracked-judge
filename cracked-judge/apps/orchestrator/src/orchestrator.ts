import genericPool from "generic-pool";
import type { HostConfig } from "./config";
import { vmLogger } from "./logger";
import { createVm } from "./vm";

type VM = Awaited<ReturnType<typeof createVm>>;

export const createVmPool = async (config: HostConfig) => {
  const vmPoolFactory: genericPool.Factory<VM> = {
    create: async function () {
      vmLogger.debug("VM POOL: Create started");
      const vm = await createVm({ config });
      vmLogger.debug("VM POOL: Create finished");
      return vm;
    },
    destroy: async function (vm) {
      vmLogger.debug("VM POOL: Destroy started");
      await vm.destroy();
      vmLogger.debug("VM POOL: Destroy finished");
    },
    validate: async function (vm) {
      vmLogger.debug("VM POOL: Validate started");
      const valid = await Promise.resolve(!vm.isDestroyed);
      vmLogger.debug("VM POOL: Validate finished");
      return valid;
    },
  };

  const pool = genericPool.createPool(vmPoolFactory, {
    // testOnBorrow: true,
    // testOnReturn: true,
    min: config.vmCount,
    max: config.vmCount,
  });

  await pool.ready();
  return pool;
};
