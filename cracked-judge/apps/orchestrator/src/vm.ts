import { CrackedError } from "@cracked-judge/common";
import {
  BindMount,
  OverlayMount,
  changePerms,
  fileExists,
} from "@cracked-judge/common/file-system";
import { createAsyncProc } from "@cracked-judge/common/proc";
import { $ } from "bun";
import { join } from "path";
import type { HostConfig } from "./config";
import { createFirecrackerClient } from "./firecracker-api";
import { vmLogger } from "./logger";

const UID = "60000" as const;
const GID = "60000" as const;

class VM implements AsyncDisposable {
  // private stack: AsyncDisposableStack = new AsyncDisposableStack();
  private stack: AsyncDisposable[] = [];
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
    const runMount = new BindMount(hostRunDir, vmRunDir, UID, GID);
    this.stack.push(runMount);
    vmLogger.debug("Created Bind Mount for VM runtime files");

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
    this.stack.push(depsMount);
    vmLogger.debug("Created Overlay Mount");

    // change permissions in the overlay; this modifies the overlayfs layer
    // and allows the VM uid/gid to access the appropriate files we have provided
    changePerms({
      path: vmDepsDir,
      uid: UID,
      gid: GID,
      mod: "777",
      recursive: true,
    });
    vmLogger.debug("Changed perms of vm dependencies overlay");

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
        logger: vmLogger.child({}, { msgPrefix: `[SOCAT] (vm: ${vmId}) ` }),
      });
      this.stack.push(socketProc);
      vmLogger.debug("Created socket proc");

      const firecrackerSockPath = this.firecrackerSockPath;
      const api = createFirecrackerClient({
        socket: this.firecrackerSockPath,
        vmId: vmId,
        fcLogger: vmLogger.child(
          { vmId },
          { msgPrefix: `[FIRECRACKER API] (post-create) ` },
        ),
      });

      const vmProc = await createAsyncProc({
        cmd: this.vmProcCmd,
        // before destroying the VM, send the ctrl+alt+delete signal
        // to firecracker, which should cause the VM to gracefully shut down

        async postCreate() {
          // await Bun.sleep(3000);
          // await tryCatch(api.GET("/"));
        },

        async preDestroy(proc) {
          try {
            if (!fileExists(firecrackerSockPath)) {
              vmLogger.error(
                `Firecracker socket doesn't exist! path: ${firecrackerSockPath}`,
              );
            }

            const res = await $`stat ${firecrackerSockPath}`.nothrow();
            console.error(res.stdout.toString());
            console.error(res.stderr.toString());

            // await api.PUT("/actions", {
            //   body: { action_type: "SendCtrlAltDel" },
            // });
            const proc = await createAsyncProc({
              cmd: [
                "curl",
                "--unix-socket",
                firecrackerSockPath,
                "-X",
                "PUT",
                "http://localhost/actions",
                "-H",
                "Content-Type: application/json", // no quotes needed in array form
                "-d",
                '{"action_type": "SendCtrlAltDel"}', // no escaping needed either
              ],
              logger: vmLogger.child({}, { msgPrefix: "CURL: " }),
            });
            await proc.getExitResult();

            // wait for it to be killed for 1000ms,
            // for firecracker that *should* be enough... presumably
            // if this fails, AsyncProc kills it forcefully
            // await Promise.race([Bun.sleep(1000), proc.getExitResult()]);
          } catch (error) {
            vmLogger.error(
              {
                errorMessage: (error as Error).message,
                socketFile: firecrackerSockPath,
                socketFileExists: fileExists(firecrackerSockPath),
              },
              "Firecracker failed in preDestroy!",
            );
          }
        },

        onError(e) {
          vmLogger.error(
            {
              errorMessage: e.message,
              code: e.code,
              cause: e.cause,
            },
            "Caught an exception during teardown",
          );
        },
      });
      this.stack.push(vmProc);
      vmLogger.debug("Created vm proc");
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
    const timeoutMs = 5000;
    const timer = setTimeout(() => {
      vmLogger.warn(
        `Resource disposal of vm (${this.vmId}) still in progress after ${timeoutMs}`,
      );
    }, timeoutMs);

    try {
      for (const item of this.stack.toReversed()) {
        try {
          await item[Symbol.asyncDispose]();
        } catch (e) {
          vmLogger.error(`Encountered exception during teardown: ${e}`);
        }
      }
    } catch (e) {
      const baseMsg =
        e instanceof CrackedError
          ? e.prettyString
          : ((e as Error)?.message ?? String(e));
      const msg = `Failed to dispose of vm (${this.vmId}): ${baseMsg}`;

      vmLogger.error(msg);
      throw new CrackedError("RESOURCE_DISPOSAL", {
        message: msg,
        cause: e,
      });
    } finally {
      clearTimeout(timer);
      vmLogger.info(`${this.vmId} destruction complete`);
    }
  };

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}

export const createVm = async (props: {
  vmId?: string;
  config: HostConfig;
}) => {
  vmLogger.debug("createVm Factory invoked");
  const { vmId = crypto.randomUUID(), config } = props;
  vmLogger.debug({ vmId, config }, "Creating VM with params:");
  const vm = new VM(vmId, config);
  vmLogger.debug("VM Constructor invoked");
  await vm.create();
  vmLogger.debug("VM created");
  return vm;
};
