import { destroyWithLogging } from "@/lib/destroy-with-logging";
import { BindMount, OverlayMount } from "@/lib/file-system";
import { changePerms } from "@/lib/file-system/utils";
import { createFirecrackerClient } from "@/lib/firecracker-api";
import { CrackedError } from "@/lib/judge-error";
import { baseLogger } from "@/lib/logger";
import { createAsyncProc } from "@/lib/proc/async-proc";
import { join } from "path";
import type { HostConfig } from "./config";

const logger = baseLogger.child({}, { msgPrefix: "[VM] " });
const UID = "60000" as const;
const GID = "60000" as const;

class VM implements AsyncDisposable {
  private stack: AsyncDisposableStack = new AsyncDisposableStack();
  private readonly vmProcCmd: string[];

  private readonly guestInitiatedSockPath: string;
  // private readonly hostInitiatedSockPath: string;
  private readonly firecrackerSockPath: string;

  private isCreated: boolean = false;
  public isDestroyed: boolean = false;

  createFilesystem = () => {};

  constructor(
    public readonly vmId: string,
    public readonly config: HostConfig,
  ) {
    const { runtimeRoot, jailerBinaryPath, firecrackerBinaryPath } = config;
    const jailerRoot = join(runtimeRoot, "jail");

    // runtime bind mount for shared files like sockets
    const hostRunDir = join(runtimeRoot, "run", vmId);
    const vmRunDir = join(jailerRoot, "firecracker", vmId, "root", "run");
    const runMount = new BindMount(hostRunDir, vmRunDir);
    this.stack.use(runMount);
    logger.debug("Created Bind Mount for VM runtime files");

    // overlay mount to expose dependencies to the VM and allow it to
    // write without modifying the originals. Prerequisite is that the
    // deps were copied from `config.depsSource` to `{runtimeRoot}/deps`
    // TODO: add a check here and throw an error if deps are not present
    const hostDepsDir = join(runtimeRoot, "deps");
    const vmDepsDir = join(jailerRoot, "firecracker", vmId, "root", "deps");
    const depsMountUpperdir = join(runtimeRoot, "temp", vmId, "upper");
    const depsMountWorkdir = join(runtimeRoot, "temp", vmId, "work");
    const depsMount = new OverlayMount(
      hostDepsDir,
      vmDepsDir,
      depsMountUpperdir,
      depsMountWorkdir,
    );
    this.stack.use(depsMount);
    logger.debug("Created Overlay Mount");

    // change permissions in the overlay; this modifies the overlayfs layer
    // and allows the VM uid/gid to access the appropriate files we have provided
    changePerms({
      path: vmDepsDir,
      uid: UID,
      gid: GID,
      mod: "777",
      recursive: true,
    });
    logger.debug("Changed perms of vm dependencies overlay");

    // directories on host where sockets can be listened
    this.guestInitiatedSockPath = join(hostRunDir, "v.sock_52");
    // this.hostInitiatedSockPath = join(hostRunDir, "v.sock");
    this.firecrackerSockPath = join(hostRunDir, "firecracker.socket");

    this.vmProcCmd = [
      //TODO: temp solution
      jailerBinaryPath,
      "--exec-file",
      firecrackerBinaryPath,
      "--uid",
      UID,
      "--gid",
      GID,
      "--id",
      vmId,
      "--chroot-base-dir",
      jailerRoot,
      "--",
      "--config-file",
      join("deps", "vm-config.json"),
    ];
  }

  create = async () => {
    const vmId = this.vmId;
    if (this.isCreated) {
      return;
    }

    this.isCreated = true;

    try {
      const socketProc = await createAsyncProc({
        cmd: [
          "socat",
          `UNIX-LISTEN:${this.guestInitiatedSockPath},fork,reuseaddr`,
          "TCP:localhost:3000",
        ],
        // SIGINT is a graceful exit for `socat` and it will clean up its own
        // socket file that was created, which isn't the case with SIGTERM
        killSignal: "SIGINT",
        logger: logger.child({}, { msgPrefix: `[SOCAT] (vm: ${vmId}) ` }),
      });
      this.stack.use(socketProc);
      logger.debug("Created socket proc");

      const firecrackerSockPath = this.firecrackerSockPath;

      const vmProc = await createAsyncProc({
        cmd: this.vmProcCmd,
        // before destroying the VM, send the ctrl+alt+delete signal
        // to firecracker, which should cause the VM to gracefully shut down

        async preDestroy(proc) {
          const api = createFirecrackerClient({
            socket: firecrackerSockPath,
            vmId: vmId,
            fcLogger: logger.child(
              {},
              { msgPrefix: `[FIRECRACKER API] (vm: ${vmId}) ` },
            ),
          });

          try {
            await api.PUT("/actions", {
              body: { action_type: "SendCtrlAltDel" },
            });
            // wait for it to be killed for 250ms,
            // for firecracker that *should* be enough... presumably
            // if this fails, AsyncProc kills it forcefully
            await Promise.race([Bun.sleep(250), proc.getExitResult()]);
          } catch (error) {
            baseLogger.error(
              { errorMessage: (error as Error).message },
              "Firecracker failed in preDestroy!",
            );
          }
        },
      });
      this.stack.use(vmProc);
      logger.debug("Created vm proc");
    } catch (e) {
      await this.destroy();
      throw new CrackedError("VM_CREATE", {
        message: `Failed to create vm ${vmId}`,
        cause: e,
      });
    }
  };

  destroy = async () => {
    if (this.isDestroyed) {
      return;
    }
    this.isDestroyed = true;
    await destroyWithLogging(
      async () => {
        await this.stack.disposeAsync();
      },
      { label: this.vmId },
    );
  };

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}

export const createVm = async (props: {
  vmId?: string;
  config: HostConfig;
}) => {
  logger.debug("createVm Factory invoked");
  const { vmId = crypto.randomUUID(), config } = props;
  logger.debug({ vmId, config }, "Creating VM with params:");
  const vm = new VM(vmId, config);
  logger.debug("VM Constructor invoked");
  await vm.create();
  logger.debug("VM created");
  return vm;
};
