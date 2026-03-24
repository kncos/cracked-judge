import { CrackedError } from "@/lib/judge-error";
import { RecursiveDir } from "../directory/recursive-directory";
import { fsLogger, isMountpoint, procLogAndMaybeThrow } from "../utils";

export interface IMount {
  readonly hostDir: string;
  readonly guestDir: string;
  destroy(): void;
  [Symbol.dispose](): void;
}

export abstract class BaseMount implements IMount {
  protected readonly baseMountErr: string;
  protected readonly baseUnmountErr: string;
  protected readonly stack: DisposableStack;

  constructor(
    public readonly hostDir: string,
    public readonly guestDir: string,
  ) {
    this.baseMountErr = `Failed to mount (${hostDir} -> ${guestDir})`;
    this.baseUnmountErr = `Failed to unmount (${guestDir})`;
    this.stack = new DisposableStack();
    // if we fail to allocate the directories, ensure cleanup occurs
    // before re-throwing the error we received
    try {
      this.stack.use(new RecursiveDir(hostDir));
      this.stack.use(new RecursiveDir(guestDir));
    } catch (e) {
      const message = `${this.baseMountErr}. CAUSE: (${(e as Error).message})`;
      fsLogger.error(message);
      this.destroy();
      throw new CrackedError("FS_MOUNT", { message, cause: e });
    }
  }

  public readonly destroy = () => {
    try {
      if (isMountpoint(this.guestDir)) {
        const cmd = ["umount", "-l", this.guestDir];
        const proc = Bun.spawnSync(cmd, { timeout: 1000 });
        procLogAndMaybeThrow(proc, cmd, "FS_MOUNT", this.baseUnmountErr);
      } else {
        fsLogger.info(
          `Mount at ${this.guestDir} is not a mount point. Skipping destroy()`,
        );
      }
    } finally {
      this.stack.dispose();
    }
  };

  [Symbol.dispose]() {
    try {
      this.destroy();
    } catch (e) {
      throw new CrackedError("RESOURCE_DISPOSAL", {
        message: `Failed to dispose mount (${this.guestDir})`,
        cause: e,
      });
    }
  }
}
