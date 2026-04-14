import { fsProcLogAndMaybeThrow } from "../utils";
import { BaseDir } from "./base-directory";

export class TempDir extends BaseDir {
  constructor(opts?: { template?: string; rootDir?: string }) {
    const { template, rootDir } = opts || {};
    const cmd = ["mktemp", "-d"];

    if (rootDir) {
      cmd.push("-p", rootDir);
    }

    if (template) {
      cmd.push(template);
    }

    const proc = Bun.spawnSync(cmd, { timeout: 1000 });
    fsProcLogAndMaybeThrow(
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
    fsProcLogAndMaybeThrow(proc, cmd, "FS_DIRECTORY", this.baseDestroyErr);
  }
}
