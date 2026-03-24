import { CrackedError } from "@/lib/judge-error";
import * as Bun from "bun";
import {
  fileExists,
  fsLogger,
  fsProcLogHelper,
  fsProcResultFormatter,
  isMountpoint,
} from "../utils";

export interface IDirectory {
  readonly dir: string;
  destroy: () => void;
  [Symbol.dispose](): void;
}

export abstract class BaseDirectory implements IDirectory {
  protected readonly baseCreateErr: string;
  protected readonly baseDestroyErr: string;
  public readonly dir: string;

  constructor(dir: string) {
    this.baseCreateErr = `Failed to create directory (${dir})`;
    this.baseDestroyErr = `Failed to destroy directory (${dir})`;
    this.dir = dir;
  }

  protected _logProc(proc: Bun.SyncSubprocess<"pipe", "pipe">, cmd: string[]) {
    fsProcLogHelper(proc, cmd);
    if (proc.exitCode !== 0) {
      throw new CrackedError("FS_DIRECTORY", {
        message: fsProcResultFormatter(cmd, proc, this.baseCreateErr),
      });
    }
  }

  public readonly destroy = () => {
    if (isMountpoint(this.dir)) {
      throw new CrackedError("FS_DIRECTORY", {
        message: `${this.baseDestroyErr}: Directory is a mount point.`,
      });
    }

    if (!fileExists(this.dir)) {
      fsLogger.info(
        `Directory at ${this.dir} doesn't exist. Skipping destroy()`,
      );
      return;
    }

    this.performDestroy();
  };

  protected abstract performDestroy(): void;

  [Symbol.dispose](): void {
    this.destroy();
  }
}
