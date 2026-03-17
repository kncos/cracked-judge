import { logger, registerProcess } from "@/lib/logger";
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
    private server: Bun.Server<any>,
    private vmfs: VmFilesystem,
    private socketLogger: pino.Logger,
    private proc: Bun.Subprocess<"ignore", "pipe", "pipe">,
  ) {}

  static create = async (vmfs: VmFilesystem): Promise<VmSocketListener> => {
    const socketPath = vmfs.guestInitiatedSocketPath;
    const socketLogger = getLogger(vmfs);
    // do this first to clean up any stale socket that might be here
    await this.rmSocketPath(vmfs);
    // get server to start listening
    // const server = createHostServer({
    //   socketPath,
    //   vmId: vmfs.vmId,
    // });

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
    registerProcess({ proc, logger: socketLogger });

    socketLogger.info({ cmd }, "Socat command used");
    const server = Bun.serve({
      port: 3000,
      fetch(req, server) {
        socketLogger.info(
          {
            url: req.url,
            headers: Object.fromEntries(req.headers),
          },
          "received fetch request",
        );

        if (server.upgrade(req)) {
          socketLogger.info({ ...req }, "upgraded connection");
          return;
        }

        return new Response("Upgrade failed", { status: 500 });
      },
      websocket: {
        message(ws, message) {
          socketLogger.info({ message }, "[Server] received message");
          ws.send("hello from server");
        },
        close(ws) {
          socketLogger.info("WebSocket connection closed");
        },
        open(ws) {
          socketLogger.info("WebSocket connection opened");
        },
      },
    });

    return new VmSocketListener(server, vmfs, socketLogger, proc);
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
    this.proc.kill();
    await VmSocketListener.rmSocketPath(this.vmfs);
    this.socketLogger.info(`shutting down listener for ${this.vmfs.vmId}`);
  };

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}
