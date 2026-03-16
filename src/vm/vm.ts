import {
  createFirecrackerClient,
  type FirecrackerClient,
} from "@/lib/firecracker-api";
import { logger, registerProcess } from "@/lib/logger";
import { tryCatch } from "@/lib/utils";
import { join } from "path";
import type pino from "pino";
import type { VmConfig } from ".";
import { VmFilesystem } from "./filesys";
import { VmSocketListener } from "./socket";

export class VM implements AsyncDisposable {
  //private stack: AsyncDisposableStack;

  private constructor(
    public readonly vmId: string,
    public readonly vmConf: VmConfig,
    private proc: ReturnType<typeof VM.spawnProcess>,
    public readonly apiClient: FirecrackerClient,
    private vmLogger: pino.Logger,
    private stack: AsyncDisposableStack,
  ) {}

  private static spawnProcess = (vmId: string, vmConf: VmConfig) => {
    const confFilePath = join("base/", "vm-config.json");
    console.log(`Using vm-config.json at: ${confFilePath}`);
    const proc = Bun.spawn(
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
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    return proc;
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
      const api = createFirecrackerClient({
        socket: fs.firecrackerApiSocketPath,
        vmId: vmId,
      });
      const vmLogger = logger.child(
        {
          vmId,
          procPid: proc.pid,
          comment: "VM created w/ bun.spawn",
        },
        { msgPrefix: `[${vmId}] ` },
      );
      registerProcess({ proc, logger: vmLogger });

      const vm = new VM(vmId, vmConf, proc, api, vmLogger, stack.move());
      return vm;
    } catch (e) {
      await stack.disposeAsync();
      throw new Error(`Failed to create vm ${vmId}`, { cause: e });
    }
  };

  destroy = async () => {
    const context = {
      action: "SendCtrlAltDelete",
      target: "Firecracker",
      vmId: this.vmId,
      comment: `Sending PUT /actions to FireCracker`,
    };

    const { data: result, error: actionErr } = await tryCatch(
      this.apiClient.PUT("/actions", {
        body: { action_type: "SendCtrlAltDel" },
      }),
    );

    await this.apiClient.GET("/vm/config").then(
      (res) => this.vmLogger.debug(res.data || "no data?"),
      (err) =>
        this.vmLogger.error({ ...context, err }, "FAILED TO GET VM CONFIG"),
    );

    if (actionErr) {
      this.vmLogger.error(
        { ...context, err: actionErr },
        "FAILED TO SEND REQ TO Firecracker",
      );
    } else {
      try {
        await Promise.race([
          this.proc.exited,
          Bun.sleep(5000).then(() => {
            throw new Error("Timeout on killing Firecracker");
          }),
        ]);
      } catch (error) {
        this.vmLogger.error((error as Error).message);
      }
    }

    this.proc.kill();
    await this.proc.exited;
    await this.stack.disposeAsync();
  };

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}
