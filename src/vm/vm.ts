import { destroyWithLogging } from "@/lib/destroy-with-logging";
import { BindMount, OverlayMount } from "@/lib/file-system";
import { changePerms } from "@/lib/file-system/utils";
import { createFirecrackerClient } from "@/lib/firecracker-api";
import { CrackedError } from "@/lib/judge-error";
import { baseLogger } from "@/lib/logger";
import { createAsyncProc } from "@/lib/proc/async-proc";
import { join } from "path";

const logger = baseLogger.child({}, { msgPrefix: "[VM] " });
const UID = "60000" as const;
const GID = "60000" as const;

class VM implements AsyncDisposable {
  //private stack: AsyncDisposableStack;

  private stack: AsyncDisposableStack = new AsyncDisposableStack();
  private readonly vmProcCmd: string[];

  private readonly depsDir: string;
  private readonly runDir: string;
  private readonly jailDir: string;

  private readonly vmRunDir: string;
  private readonly vmDepsDir: string;

  private readonly guestInitiatedSockPath: string;
  private readonly hostInitiatedSockPath: string;
  private readonly firecrackerSockPath: string;

  private isCreated: boolean = false;
  public isDestroyed: boolean = false;

  constructor(
    public readonly vmId: string,
    public readonly vmRoot: string,
  ) {
    // host directories
    this.depsDir = join(vmRoot, "base");
    this.runDir = join(vmRoot, "run", vmId);
    // jail directory where VM stuff goes
    this.jailDir = join(vmRoot, "jail");
    // directories inside vm chroot
    this.vmRunDir = join(this.jailDir, "firecracker", vmId, "root", "run");
    this.vmDepsDir = join(this.jailDir, "firecracker", vmId, "root", "base");

    this.guestInitiatedSockPath = join(this.runDir, "v.sock_52");
    this.hostInitiatedSockPath = join(this.runDir, "v.sock");
    this.firecrackerSockPath = join(this.runDir, "firecracker.sock");

    this.vmProcCmd = [
      //TODO: temp solution
      join(vmRoot, "jailer"),
      "--exec-file",
      join(vmRoot, "firecracker"),
      "--uid",
      UID,
      "--gid",
      GID,
      "--id",
      vmId,
      "--chroot-base-dir",
      this.jailDir,
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

    try {
      // we can place sockets in the host dir then bind mount them
      // into the vm's /run/ directory, as well as any other metadata
      const run = new BindMount(this.runDir, this.vmRunDir, UID, GID);
      this.stack.use(run);
      logger.debug("Created Bind Mount");

      // place dependencies in VM chroot dir using overlayfs so it can
      // modify them ephemerally without cloning the large dependencies in full
      const deps = new OverlayMount(this.depsDir, this.vmDepsDir);
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
        async preDestroy() {
          const api = createFirecrackerClient({
            socket: firecrackerSockPath,
            vmId: vmId,
            fcLogger: logger.child(
              {},
              { msgPrefix: `[FIRECRACKER API] (vm: ${vmId}) ` },
            ),
          });
          await api.PUT("/actions", {
            body: { action_type: "SendCtrlAltDel" },
          });
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

export const createVm = async (props: { vmId?: string; vmRoot: string }) => {
  logger.debug("createVm Factory invoked");
  const { vmId = crypto.randomUUID(), vmRoot } = props;
  logger.debug({ vmId, vmRoot }, "Creating VM with params:");
  const vm = new VM(vmId, vmRoot);
  logger.debug("VM Constructor invoked");
  await vm.create();
  logger.debug("VM created");
  return vm;
};
