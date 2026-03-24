import { CrackedError } from "../judge-error";
import {
  fsLogger,
  fsProcLogHelper,
  fsProcResultFormatter,
  isMountpoint,
} from "./utils";

export class OverlayMount {
  private constructor(
    public readonly uid: string,
    public readonly gid: string,
    public readonly hostDir: string,
    public readonly guestDir: string,
  ) {}

  public static create = (params: {
    uid: string;
    gid: string;
    hostDir: string;
    guestDir: string;
  }): OverlayMount => {
    const { uid, gid, hostDir, guestDir } = params;
    const baseErrMsg = `Failed to bind mount directory (${hostDir} -> ${guestDir})`;

    if (isMountpoint(guestDir)) {
      throw new CrackedError("FS_BIND_MOUNT", {
        message: `${baseErrMsg}. The directory "${guestDir}" is already a mountpoint`,
      });
    }

    const cmd = [
      "mount",
      "--bind",
      `--map-users`,
      `0:${uid}:65534`,
      `--map-groups`,
      `0:${gid}:65534`,
      hostDir,
      guestDir,
    ];
    const proc = Bun.spawnSync(cmd, {
      timeout: 1000,
    });
    fsProcLogHelper(proc);
    if (proc.exitCode !== 0) {
      throw new CrackedError("FS_BIND_MOUNT", {
        message: fsProcResultFormatter(cmd, proc, baseErrMsg),
      });
    }
    return new OverlayMount(uid, gid, hostDir, guestDir);
  };

  public destroy = () => {
    if (!isMountpoint(this.guestDir)) {
      fsLogger.info(
        `Bindmount at ${this.guestDir} is not a mount point. Skipping destroy()`,
      );
      return;
    }

    const cmd = ["umount", "-l", this.guestDir];
    const proc = Bun.spawnSync(cmd, {
      timeout: 1000,
    });
    fsProcLogHelper(proc);
    if (proc.exitCode !== 0) {
      throw new CrackedError("FS_BIND_MOUNT", {
        message: fsProcResultFormatter(
          cmd,
          proc,
          `Failed to unmount directory (${this.guestDir}):`,
        ),
      });
    }
  };

  [Symbol.dispose]() {
    try {
      this.destroy();
    } catch (e) {
      throw new CrackedError("RESOURCE_DISPOSAL", {
        message: "Failed to clean up resource OverlayMount",
        cause: e,
      });
    }
  }
}
