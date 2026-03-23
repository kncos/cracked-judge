import { destroyWithLogging } from "@/lib/destroy-with-logging";
import { CrackedError, handleError } from "@/lib/judge-error";
import { baseLogger } from "@/lib/logger";
import { Server } from "@/server/server";
import type { VmConfig } from ".";
import { AsyncDisposableMap } from "../lib/AsyncDisposableMap";
import { tryCatch } from "../lib/utils";
import { VM } from "./vm";

const poolLogger = baseLogger.child({}, { msgPrefix: "[VM Pool] " });

export class VmOrchestrator implements AsyncDisposable {
  private resources: AsyncDisposableMap<string, VM> = new AsyncDisposableMap();
  // private server: Server;
  private constructor(
    public readonly conf: VmConfig,
    private readonly server: Server,
  ) {}

  public static create = async (vmConf: VmConfig) => {
    const server = await Server.create();
    return new VmOrchestrator(vmConf, server);
  };

  public destroy = async () => {
    await destroyWithLogging(
      async () => {
        await this.resources[Symbol.asyncDispose]();
        await this.server.destroy();
      },
      {
        label: "Orchestrator",
      },
    );
  };

  spawnVm = async (vmId?: string): Promise<string> => {
    const id =
      vmId ?? `vm-${crypto.getRandomValues(new Uint8Array(4)).toHex()}`;
    if (this.resources.has(id)) {
      throw new CrackedError("VM_POOL", {
        message: `VM with vmID: ${id} already exists! Did you mean to replace()?`,
      });
    }
    const { data, error } = await tryCatch(VM.create(id, this.conf));
    if (error) {
      return handleError(error, {
        overrideCode: "VM_POOL",
        comment: "VM creation threw in vm pool",
        logger: poolLogger,
      });
    }
    await this.resources.set(id, data);
    return id;
  };

  killVm = async (vmId: string) => {
    await this.resources.delete(vmId);
  };

  resetVm = async (vmId: string) => {
    await this.killVm(vmId);
    await this.spawnVm(vmId);
  };

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}
