import { CrackedError } from "../../judge-error";
import { fsProcLogHelper, fsProcResultFormatter } from "../utils";
import { BaseDirectory } from "./base-directory";

export class Directory extends BaseDirectory {
  private constructor(dir: string) {
    super(dir);
  }

  public static create(dir: string): Directory {
    const instance = new Directory(dir);

    const cmd = ["mkdir", "-p", dir];
    const proc = Bun.spawnSync(cmd, { timeout: 1000 });
    instance._logProc(proc, cmd);

    return instance;
  }

  protected performDestroy(): void {
    const cmd = ["rm", "-rf", this.dir];
    // directory should have very little, 2500ms should be overly safe
    const proc = Bun.spawnSync(cmd, { timeout: 2500 });
    fsProcLogHelper(proc, cmd);
    if (proc.exitCode !== 0) {
      throw new CrackedError("FS_DIRECTORY", {
        message: fsProcResultFormatter(cmd, proc, this.baseDestroyErr),
      });
    }
  }
}
