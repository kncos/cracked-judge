import { $ } from "bun";
import type { VmFilesystem } from "./filesys";

export class VmSocketListener implements AsyncDisposable {
  private constructor(
    private server: Bun.UnixSocketListener<{ buf: string }>,
    private vmfs: VmFilesystem,
  ) {}

  static create = async (vmfs: VmFilesystem): Promise<VmSocketListener> => {
    const socketPath = vmfs.guestInitiatedSocketPath;
    console.log(`Creating listener on ${socketPath}`);
    // do this first to clean up any stale socket that might be here
    await this.rmSocketPath(vmfs);
    const prefix = vmfs.vmId;
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
              if (line.trim()) console.log(`[${prefix}] ${line}`);
            }
          },
          error(_, err) {
            console.error(`[${prefix}] socket error: `, err);
          },
        },
      });
      return new VmSocketListener(server, vmfs);
    } catch (e) {
      await VmSocketListener.rmSocketPath(vmfs);
      throw new Error(
        `[${prefix}] failed to create socket listener at: ${socketPath}`,
        { cause: e },
      );
    }
  };

  private static rmSocketPath = async (vmfs: VmFilesystem) => {
    const socketPath = vmfs.guestInitiatedSocketPath;
    const prefix = vmfs.vmId;
    const rm = await $`rm -f ${socketPath}`.throws(false).quiet();
    if (rm.exitCode !== 0) {
      console.log(`[${prefix}] rm -f ${socketPath} failed:`);
      console.log(`stdout: ${new TextDecoder().decode(rm.stdout)}`);
      console.log(`stderr: ${new TextDecoder().decode(rm.stderr)}`);
    }
  };

  destroy = async () => {
    this.server.stop();
    console.log(`shutting down listener for ${this.vmfs.vmId}`);
    await VmSocketListener.rmSocketPath(this.vmfs);
  };

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}
