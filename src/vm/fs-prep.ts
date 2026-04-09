import { RecursiveDir } from "@/lib/file-system";
import { fsProcLogAndMaybeThrow } from "@/lib/file-system/utils";
import path from "path";
import { validateHostConfig, type HostConfig } from "./config";

export class HostFilesystem implements Disposable, AsyncDisposable {
  private readonly stack = new DisposableStack();

  /**
   * This path is used for the runtime deps directory. Deps are copied here from depsSource provided
   * in the `config`, and afterwards this directory serves as the lower directory for overlay mounts
   * into each VM's chroot. VMs do not write to this directory, they write to their overlay
   */
  public readonly runtimeDepsPath: string;
  /**
   * This path is used for runtime temporary files such as sockets and metadata that are shared
   * with the VM. The VM and Host can both modify these files as they are not an overlay
   */
  public readonly runtimeRunPath: string;

  constructor(public readonly config: HostConfig) {
    // throws if invalid
    validateHostConfig(config);

    const { depsSource, runtimeRoot } = config;
    this.runtimeDepsPath = path.join(runtimeRoot, "deps");
    this.runtimeRunPath = path.join(runtimeRoot, "run");

    // Dependencies are copied to a deps dir in the runtime directory
    // because this ensures that all files being referenced or used at
    // runtime are on the same disk location. This is important because
    // this program creates mountpoints, and if we were to do something
    // like have a ramdisk be the runtime dir, but deps is on the SSD,
    // it would create a copy of the deps each time and fill the ramdisk
    const depsDir = new RecursiveDir(this.runtimeDepsPath);

    this.stack.use(depsDir);
    const cmd = [
      "rsync",
      "--sparse",
      "-a",
      // trailing `/` ensures contents are copied
      `${depsSource}/`,
      depsDir.dir, // target directory
    ];
    const proc = Bun.spawnSync(cmd);
    fsProcLogAndMaybeThrow(
      proc,
      cmd,
      "FS_WRITE",
      "Failed to copy files from dependencies source to runtime deps dir:",
    );
  }

  destroy() {
    this.stack.dispose();
  }

  [Symbol.dispose](): void {
    this.destroy();
  }

  async [Symbol.asyncDispose]() {
    this[Symbol.dispose]();
    await Promise.resolve();
  }
}
