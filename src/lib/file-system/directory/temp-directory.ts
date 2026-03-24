import { procLogAndMaybeThrow } from "../utils";
import { BaseDir } from "./base-directory";

export class TempDir extends BaseDir {
  constructor() {
    const cmd = ["mktemp", "-d"];
    const proc = Bun.spawnSync(cmd, { timeout: 1000 });
    procLogAndMaybeThrow(
      proc,
      cmd,
      "FS_DIRECTORY",
      "Failed to create tmp directory",
    );
    const dir = proc.stdout.toString().trim();
    super(dir);
  }

  protected performDestroy(): void {
    const cmd = ["rm", "-rf", this.dir];
    const proc = Bun.spawnSync(cmd, { timeout: 2500 });
    procLogAndMaybeThrow(proc, cmd, "FS_DIRECTORY", this.baseDestroyErr);
  }
}
