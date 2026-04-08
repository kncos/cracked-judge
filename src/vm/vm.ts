import { destroyWithLogging } from "@/lib/destroy-with-logging";
import { BindMount, OverlayMount } from "@/lib/file-system";
import { TempFile } from "@/lib/file-system/file/temp-file";
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
  //private stack: AsyncDisposableStack;

  private stack: AsyncDisposableStack = new AsyncDisposableStack();
  private readonly vmProcCmd: string[];

  // private readonly depsDir: string;
  // private readonly runDir: string;
  // private readonly jailDir: string;

  private readonly vmRunDir: string;
  private readonly vmDepsDir: string;

  private readonly guestInitiatedSockPath: string;
  private readonly hostInitiatedSockPath: string;
  private readonly firecrackerSockPath: string;

  private isCreated: boolean = false;
  public isDestroyed: boolean = false;

  constructor(
    public readonly vmId: string,
    public readonly config: HostConfig,
  ) {
    const {
      jailerRoot,
      hostRuntimeRoot,
      jailerBinaryPath,
      firecrackerBinaryPath,
    } = config;

    // directories inside vm chroot
    this.vmRunDir = join(jailerRoot, "firecracker", vmId, "root", "run");
    this.vmDepsDir = join(jailerRoot, "firecracker", vmId, "root", "base");

    // directories on host where sockets can be listened
    this.guestInitiatedSockPath = join(hostRuntimeRoot, "v.sock_52");
    this.hostInitiatedSockPath = join(hostRuntimeRoot, "v.sock");
    this.firecrackerSockPath = join(hostRuntimeRoot, "firecracker.socket");

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
      join("base", "vm-config.json"),
    ];
  }

  create = async () => {
    const vmId = this.vmId;
    if (this.isCreated) {
      return;
    }

    this.isCreated = true;

    const { hostRuntimeRoot, depsRoot } = this.config;

    try {
      // we can place sockets in the host dir then bind mount them
      // into the vm's /run/ directory, as well as any other metadata
      const run = new BindMount(hostRuntimeRoot, this.vmRunDir, UID, GID);
      this.stack.use(run);
      logger.debug("Created Bind Mount for VM runtime files");

      // metadata allows the VM to access metadata about itself
      const meta = new TempFile(join(this.vmRunDir, "meta"), vmId);
      this.stack.use(meta);
      logger.debug("Created metadata file containing VM id");

      // place dependencies in VM chroot dir using overlayfs so it can
      // modify them ephemerally without cloning the large dependencies in full
      const deps = new OverlayMount(depsRoot, this.vmDepsDir);
      this.stack.use(deps);
      logger.debug("Created Overlay Mount");

      // change permissions in the overlay; this modifies the overlayfs layer
      // and allows the VM uid/gid to access the appropriate files we have provided
      changePerms({
        path: this.vmDepsDir,
        uid: UID,
        gid: GID,
        mod: "777",
        recursive: true,
      });
      logger.debug("Changed perms");

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
