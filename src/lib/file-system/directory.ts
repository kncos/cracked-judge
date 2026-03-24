import { CrackedError } from "../judge-error";
import { fsProcLogHelper, fsProcResultFormatter, isMountpoint } from "./utils";

export class Directory {
  private constructor(public readonly dir: string) {}

  public static create = (dir: string): Directory => {
    const baseErrMsg = `Failed to create directory (${dir})`;

    const cmd = ["mkdir", "-p", dir];
    const proc = Bun.spawnSync(cmd, {
      timeout: 1000,
    });
    fsProcLogHelper(proc);
    if (proc.exitCode !== 0) {
      throw new CrackedError("FS_DIRECTORY", {
        message: fsProcResultFormatter(cmd, proc, baseErrMsg),
      });
    }
    return new Directory(dir);
  };

  public destroy = () => {
    const baseErrMsg = `Failed to destroy directory (${this.dir})`;

    if (!isMountpoint(this.dir)) {
      throw new CrackedError("FS_DIRECTORY", {
        message: `${baseErrMsg}: Directory is a mount point.`,
      });
    }

    const cmd = ["rm", "-rf", this.dir];
    const proc = Bun.spawnSync(cmd, {
      timeout: 1000,
    });
    fsProcLogHelper(proc);
    if (proc.exitCode !== 0) {
      throw new CrackedError("FS_DIRECTORY", {
        message: fsProcResultFormatter(cmd, proc, baseErrMsg),
      });
    }
  };

  [Symbol.dispose]() {
    try {
      this.destroy();
    } catch (e) {
      throw new CrackedError("RESOURCE_DISPOSAL", {
        message: "Failed to clean up resource Directory",
        cause: e,
      });
    }
  }
}
