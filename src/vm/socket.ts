import { logger } from "@/lib/logger";
import { $ } from "bun";
import type pino from "pino";
import type { VmFilesystem } from "./filesys";

const getLogger = (vmfs: VmFilesystem) => {
  const prefix = vmfs.vmId;
  const socketLogger = logger.child({}, { msgPrefix: `[Socket ${prefix}] ` });
  return socketLogger;
};

export class VmSocketListener implements AsyncDisposable {
  private constructor(
    private server: Bun.UnixSocketListener<{ buf: string }>,
    private vmfs: VmFilesystem,
    private socketLogger: pino.Logger,
  ) {}

  static create = async (vmfs: VmFilesystem): Promise<VmSocketListener> => {
    const socketPath = vmfs.guestInitiatedSocketPath;
    // do this first to clean up any stale socket that might be here
    await this.rmSocketPath(vmfs);
    const socketLogger = getLogger(vmfs);
    try {
      const server = Bun.listen<{ buf: string }>({
        unix: socketPath,
        socket: {
          open(socket) {
            socket.data = { buf: "" };
          },
          data(socket, chunk) {
            socket.data.buf += new TextDecoder().decode(chunk);
            const lines = socket.data.buf.split("\n");
            socket.data.buf = lines.pop()!;
            for (const line of lines) {
              // temporarily left in
              if (line.trim()) console.log(`[${vmfs.vmId}] ${line}`);
            }
          },
          error(_, err) {
            socketLogger.error(`socket error: ${err.message}`);
          },
        },
      });
      return new VmSocketListener(server, vmfs, socketLogger);
    } catch (e) {
      await VmSocketListener.rmSocketPath(vmfs);
      const text = e instanceof Error ? e.message : "`e` was not an Error type";
      socketLogger.error(
        {
          errorMsg: text,
          socketPath,
          vmId: vmfs.vmId,
        },
        "Failed to create socket listener",
      );
      throw e;
    }
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
    this.server.stop();
    this.socketLogger.info(`shutting down listener for ${this.vmfs.vmId}`);
    await VmSocketListener.rmSocketPath(this.vmfs);
  };

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}
