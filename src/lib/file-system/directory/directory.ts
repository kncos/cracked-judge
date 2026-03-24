import { fsProcLogAndMaybeThrow } from "../utils";
import { BaseDir } from "./base-directory";

export class Dir extends BaseDir {
  public constructor(dir: string) {
    super(dir);

    const cmd = ["mkdir", dir];
    const proc = Bun.spawnSync(cmd, { timeout: 1000 });
    fsProcLogAndMaybeThrow(proc, cmd, "FS_DIRECTORY", this.baseCreateErr);
  }

  protected performDestroy(): void {
    const cmd = ["rm", "-rf", this.dir];
    // directory should have very little, 2500ms should be overly safe
    const proc = Bun.spawnSync(cmd, { timeout: 2500 });
    fsProcLogAndMaybeThrow(proc, cmd, "FS_DIRECTORY", this.baseDestroyErr);
  }
}
