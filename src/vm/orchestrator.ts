import type { VmConfig } from ".";
import { AsyncDisposableMap } from "../lib/AsyncDisposableMap";
import { tryCatch } from "../lib/utils";
import { VM } from "./vm";

export class VmOrchestrator implements AsyncDisposable {
  private resources: AsyncDisposableMap<string, VM> = new AsyncDisposableMap();
  public constructor(public readonly conf: VmConfig) {}

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
    this.resources.set(id, data);
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
    await this.resources[Symbol.asyncDispose]();
  }
}
