import { CrackedError, tryCatchSync } from "../..";
import { RecursiveDir } from "../directory";
import { TempDir } from "../directory/temp-directory";
import { fsLogger, fsProcLogAndMaybeThrow, isMountpoint } from "../utils";
import { BaseMount } from "./base-mount";

export class OverlayMount extends BaseMount {
  private create() {
    if (isMountpoint(this.guestDir)) {
      const message = `${this.baseMountErr}: "${this.guestDir}" is already a mountpoint`;
      fsLogger.error(message);
      throw new CrackedError("FS_OVERLAY_MOUNT", {
        message: message,
      });
    }

    const cmd = [
      "mount",
      "-t",
      "overlay",
      "overlay",
      "-o",
      `lowerdir=${this.hostDir},upperdir=${this.upperDir},workdir=${this.workDir}`,
      this.guestDir,
    ];
    const proc = Bun.spawnSync(cmd, { timeout: 1000 });
    fsProcLogAndMaybeThrow(proc, cmd, "FS_OVERLAY_MOUNT", this.baseMountErr);
  }

  public readonly upperDir: string;
  public readonly workDir: string;

  constructor(
    hostDir: string,
    guestDir: string,
    upperDir?: string,
    workDir?: string,
  ) {
    super(hostDir, guestDir);

    const upperRes = tryCatchSync(() => {
      const upper = upperDir ? new RecursiveDir(upperDir) : new TempDir();
      this.stack.use(upper);
      return upper;
    });
    if (upperRes.error) {
      const message = `${this.baseMountErr}: ${upperRes.error.message}`;
      fsLogger.error(message);
      throw new CrackedError("FS_OVERLAY_MOUNT", {
        message,
        cause: upperRes.error,
      });
    }
    this.upperDir = upperRes.data.dir;

    const workRes = tryCatchSync(() => {
      const work = workDir ? new RecursiveDir(workDir) : new TempDir();
      this.stack.use(work);
      return work;
    });
    if (workRes.error) {
      const message = `${this.baseMountErr}: ${workRes.error.message}`;
      fsLogger.error(message);
      throw new CrackedError("FS_OVERLAY_MOUNT", {
        message,
        cause: workRes.error,
      });
    }
    this.workDir = workRes.data.dir;

    try {
      this.create();
    } catch (e) {
      this.destroy();
      throw e;
    }
  }
}
