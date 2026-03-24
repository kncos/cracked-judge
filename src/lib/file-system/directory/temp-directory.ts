import { CrackedError } from "@/lib/judge-error";
import { fsProcLogHelper, fsProcResultFormatter } from "../utils";
import { BaseDirectory } from "./base-directory";

export class TempDirectory extends BaseDirectory {
  private constructor(dir: string) {
    super(dir);
  }

  public static create(): TempDirectory {
    const cmd = ["mktemp", "-d"];
    const proc = Bun.spawnSync(cmd, { timeout: 1000 });

    fsProcLogHelper(proc, cmd);
    if (proc.exitCode !== 0) {
      throw new CrackedError("FS_DIRECTORY", {
        message: fsProcResultFormatter(
          cmd,
          proc,
          "Failed to create temp directory",
        ),
      });
    }

    const dir = proc.stdout.toString().trim();
    const instance = new TempDirectory(dir);

    return instance;
  }

  protected performDestroy(): void {
    const cmd = ["rm", "-rf", this.dir];
    const proc = Bun.spawnSync(cmd, { timeout: 2500 });
    fsProcLogHelper(proc, cmd);
    if (proc.exitCode !== 0) {
      throw new CrackedError("FS_DIRECTORY", {
        message: fsProcResultFormatter(cmd, proc, this.baseDestroyErr),
      });
    }
  }
}
