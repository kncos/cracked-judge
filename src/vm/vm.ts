import { join } from "path";
import type { VmConfig } from ".";
import { VmFilesystem } from "./filesys";
import { VmSocketListener } from "./socket";

export class VM implements AsyncDisposable {
  //private stack: AsyncDisposableStack;

  private constructor(
    public readonly vmId: string,
    public readonly vmConf: VmConfig,
    private proc: ReturnType<typeof VM.spawnProcess>,
    private stack: AsyncDisposableStack,
  ) {}

  private static spawnProcess = (vmId: string, vmConf: VmConfig) => {
    const confFilePath = join("base/", "vm-config.json");
    console.log(`Using vm-config.json at: ${confFilePath}`);
    return Bun.spawn(
      [
        vmConf.jailerBinary,
        "--exec-file",
        vmConf.firecrackerBinary,
        "--uid",
        vmConf.uid,
        "--gid",
        vmConf.gid,
        "--id",
        vmId,
        "--chroot-base-dir",
        vmConf.jail,
        "--",
        "--config-file",
        // we'll always use an overlayfs to bind to chroot/base for the vm
        confFilePath,
      ],
      {
        stderr: "inherit",
        stdout: "inherit",
      },
    );
  };

  static create = async (vmId: string, vmConf: VmConfig): Promise<VM> => {
    const stack = new AsyncDisposableStack();
    try {
      const fs = await VmFilesystem.create(vmId, vmConf);
      stack.use(fs);
      const listener = await VmSocketListener.create(fs);
      stack.use(listener);
      // console.log("printing tree");
      // await $`pwd`.nothrow();
      const proc = VM.spawnProcess(vmId, vmConf);
      const vm = new VM(vmId, vmConf, proc, stack.move());
      return vm;
    } catch (e) {
      await stack.disposeAsync();
      throw new Error(`Failed to create vm ${vmId}`, { cause: e });
    }
  };

  destroy = async () => {
    this.proc.kill();
    await this.proc.exited;
    await this.stack.disposeAsync();
  };

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}
