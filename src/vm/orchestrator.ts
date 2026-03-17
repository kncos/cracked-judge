import { logger } from "@/lib/logger";
import { VmServer } from "@/orpc/vm-api/server";
import type { VmConfig } from ".";
import {
  AsyncDisposableMap,
  MultiAsyncDisposeError,
} from "../lib/AsyncDisposableMap";
import { tryCatch } from "../lib/utils";
import { VM } from "./vm";

export class VmOrchestrator implements AsyncDisposable {
  private resources: AsyncDisposableMap<string, VM> = new AsyncDisposableMap();
  private server: VmServer;
  public constructor(public readonly conf: VmConfig) {
    this.server = VmServer.create();
  }

  spawnVm = async (vmId?: string): Promise<string> => {
    const id =
      vmId ?? `vm-${crypto.getRandomValues(new Uint8Array(4)).toHex()}`;
    if (this.resources.has(id)) {
      throw new Error(
        `VM with vmID: ${id} already exists! Did you mean to replace()?`,
      );
    }
    const { data, error } = await tryCatch(VM.create(id, this.conf));
    if (error) {
      throw error;
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
    try {
      await this.server.destroy();
      await this.resources[Symbol.asyncDispose]();
    } catch (error) {
      if (error instanceof MultiAsyncDisposeError) {
        logger.error(error.cause, "Failed to dispose of VM orchestrator!");
      }
    }
  }
}
