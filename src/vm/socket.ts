import { logger } from "@/lib/logger";
import type { VmContext } from "@/orpc/router";
import { createHostServer } from "@/orpc/server";
import { $ } from "bun";
import type pino from "pino";
import { VmFilesystem } from "./filesys";

const getLogger = (vmfs: VmFilesystem) => {
  const prefix = vmfs.vmId;
  const socketLogger = logger.child({}, { msgPrefix: `[Socket ${prefix}] ` });
  return socketLogger;
};

export class VmSocketListener implements AsyncDisposable {
  private constructor(
    private server: Bun.Server<VmContext>,
    private vmfs: VmFilesystem,
    private socketLogger: pino.Logger,
  ) {}

  static create = async (vmfs: VmFilesystem): Promise<VmSocketListener> => {
    const socketPath = vmfs.guestInitiatedSocketPath;
    // do this first to clean up any stale socket that might be here
    await this.rmSocketPath(vmfs);
    // get server to start listening
    const server = createHostServer({
      socketPath,
      vmId: vmfs.vmId,
    });
    return new VmSocketListener(server, vmfs, getLogger(vmfs));
  };

  private static rmSocketPath = async (vmfs: VmFilesystem) => {
    const socketPath = vmfs.guestInitiatedSocketPath;
    const rm = await $`rm -f ${socketPath}`.throws(false).quiet();
    const socketLogger = getLogger(vmfs);
    if (rm.exitCode !== 0) {
      socketLogger.warn(
        {
          socketPath,
          vmId: vmfs.vmId,
          cmd: `rm -f ${socketPath}`,
          stdout: new TextDecoder().decode(rm.stdout),
          stderr: new TextDecoder().decode(rm.stderr),
        },
        "socket file removal operation failed",
      );
    }
  };

  destroy = async () => {
    await this.server.stop(true);
    await VmSocketListener.rmSocketPath(this.vmfs);
    this.socketLogger.info(`shutting down listener for ${this.vmfs.vmId}`);
  };

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}
