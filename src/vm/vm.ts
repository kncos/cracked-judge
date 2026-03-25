import { destroyWithLogging } from "@/lib/destroy-with-logging";
import {
  createFirecrackerClient,
  type FirecrackerClient,
} from "@/lib/firecracker-api";
import { CrackedError } from "@/lib/judge-error";
import { baseLogger, registerAsyncProc } from "@/lib/logger";
import { join } from "path";
import type { VmConfig } from ".";
import { VmFilesystem } from "./filesys";
import { VmSocketListener } from "./socket";

const getLogger = (vmId: string) => {
  const vmLogger = baseLogger.child({}, { msgPrefix: `[${vmId}] ` });
  return vmLogger;
};

const UID = "60000" as const;
const GID = "60000" as const;

export class VM implements AsyncDisposable {
  //private stack: AsyncDisposableStack;

  private constructor(
    public readonly vmId: string,
    public readonly vmConf: VmConfig,
    private proc: ReturnType<typeof VM.spawnProcess>,
    public readonly apiClient: FirecrackerClient,
    private stack: AsyncDisposableStack,
  ) {}

  private static spawnProcess = (vmId: string, vmConf: VmConfig) => {
    const confFilePath = join("base/", "vm-config.json");
    const vmLogger = getLogger(vmId);
    vmLogger.debug(`using config file ${confFilePath}`);

    const proc = Bun.spawn(
      [
        vmConf.jailerBinaryPath,
        "--exec-file",
        vmConf.firecrackerBinaryPath,
        "--uid",
        UID,
        "--gid",
        GID,
        "--id",
        vmId,
        "--chroot-base-dir",
        vmConf.jailDir,
        "--",
        "--config-file",
        // we'll always use an overlayfs to bind to chroot/base for the vm
        confFilePath,
      ],
      {
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    // ongoing background process that pipes stdout/stderr to our logger
    registerAsyncProc({
      proc,
      logger: vmLogger,
    });
    return proc;
  };

  static create = async (vmId: string, vmConf: VmConfig): Promise<VM> => {
    const stack = new AsyncDisposableStack();
    try {
      const fs = await VmFilesystem.create(vmId, vmConf);
      stack.use(fs);
      const listener = await VmSocketListener.create(fs);
      stack.use(listener);

      const proc = VM.spawnProcess(vmId, vmConf);
      const vmLogger = getLogger(vmId).child({ procPid: proc.pid });
      const api = createFirecrackerClient({
        socket: fs.firecrackerApiSocketPath,
        vmId: vmId,
        fcLogger: vmLogger,
      });

      const vm = new VM(vmId, vmConf, proc, api, stack.move());
      return vm;
    } catch (e) {
      await stack.disposeAsync();
      throw new CrackedError("VM_CREATE", {
        message: `Failed to create vm ${vmId}`,
        cause: e,
      });
    }
  };

  destroy = async () => {
    await destroyWithLogging(
      async () => {
        await this.apiClient.PUT("/actions", {
          body: { action_type: "SendCtrlAltDel" },
        });
        this.proc.kill();
        await this.stack.disposeAsync();
        await this.proc.exited;
      },
      {
        label: this.vmId,
      },
    );
  };

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}
