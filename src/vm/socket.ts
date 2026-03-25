import { destroyWithLogging } from "@/lib/destroy-with-logging";
import { baseLogger, registerAsyncProc } from "@/lib/logger";
import { $ } from "bun";
import type pino from "pino";
import { VmFilesystem } from "./filesys";

const getLogger = () => {
  const socketLogger = baseLogger.child({}, { msgPrefix: `[Socket] ` });
  return socketLogger;
};

export class VmSocketListener implements AsyncDisposable {
  private constructor(
    private vmfs: VmFilesystem,
    private socketLogger: pino.Logger,
    private proc: Bun.Subprocess<"ignore", "pipe", "pipe">,
  ) {}

  static create = async (vmfs: VmFilesystem): Promise<VmSocketListener> => {
    const socketPath = vmfs.guestInitiatedSocketPath;
    const socketLogger = getLogger();
    // do this first to clean up any stale socket that might be here
    await this.rmSocketPath(vmfs);

    const cmd = [
      "socat",
      `UNIX-LISTEN:${socketPath},fork,reuseaddr`,
      "TCP:localhost:3000",
    ];

    const proc = Bun.spawn({
      cmd,
      stdout: "pipe",
      stderr: "pipe",
    });
    registerAsyncProc({ proc, logger: socketLogger });
    // get server to start listening

    return new VmSocketListener(vmfs, socketLogger, proc);
  };

  private static rmSocketPath = async (vmfs: VmFilesystem) => {
    const socketPath = vmfs.guestInitiatedSocketPath;
    const rm = await $`rm -f ${socketPath}`.throws(false).quiet();
    const socketLogger = getLogger();
    if (rm.exitCode !== 0) {
      socketLogger.warn(
        {
          cmd: `rm -f ${socketPath}`,
          stdout: new TextDecoder().decode(rm.stdout),
          stderr: new TextDecoder().decode(rm.stderr),
        },
        "socket file removal operation failed",
      );
    }
  };

  destroy = async () => {
    await destroyWithLogging(
      async () => {
        this.proc.kill();
        await VmSocketListener.rmSocketPath(this.vmfs);
      },
      { label: "Socket", ctx: { vmId: this.vmfs.vmId } },
    );
  };

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}
