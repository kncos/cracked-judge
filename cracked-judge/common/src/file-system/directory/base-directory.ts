import { CrackedError } from "../..";
import { fileExists, fsLogger, isMountpoint } from "../utils";

export interface IDir {
  readonly dir: string;
  destroy: () => void;
  [Symbol.dispose](): void;
}

export abstract class BaseDir implements IDir {
  protected readonly baseCreateErr: string;
  protected readonly baseDestroyErr: string;
  public readonly dir: string;

  constructor(dir: string) {
    this.baseCreateErr = `Failed to create directory (${dir})`;
    this.baseDestroyErr = `Failed to destroy directory (${dir})`;
    this.dir = dir;
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

  [Symbol.asyncDispose]() {
    this[Symbol.dispose]();
    return Promise.resolve();
  }
}
