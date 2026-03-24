import path from "node:path";
import { CrackedError } from "../judge-error";
import { tryCatchSync } from "../utils";
import { Dir } from "./directory/directory";
import {
  fsLogger,
  fsProcLogHelper,
  fsProcResultFormatter,
  isMountpoint,
  makeTempDir,
} from "./utils";

export class OverlayMount {
  private constructor(
    public readonly hostDir: string,
    public readonly guestDir: string,
  ) {}

  public static create = (params: {
    hostDir: string;
    guestDir: string;
  }): OverlayMount => {
    const { hostDir, guestDir } = params;
    const baseErrMsg = `Failed to overlay mount directory (${hostDir} -> ${guestDir})`;

    if (isMountpoint(guestDir)) {
      const message = `${baseErrMsg}. The directory "${guestDir}" is already a mountpoint`;
      fsLogger.error(message);
      throw new CrackedError("FS_OVERLAY_MOUNT", {
        message,
      });
    }

    const tempDirResult = tryCatchSync(makeTempDir);
    if (tempDirResult.error) {
      const message = `${baseErrMsg}: ${tempDirResult.error.message}`;
      fsLogger.error(message);
      throw new CrackedError("FS_OVERLAY_MOUNT", {
        message,
        cause: tempDirResult.error,
      });
    }
    const tempDir = tempDirResult.data;
    const upperPath = path.join(tempDir, "upper");
    const workPath = path.join(tempDir, "workspace");

    const upperRes = tryCatchSync(() => new Dir(upperPath));
    if (upperRes.error) {
      const message = `${baseErrMsg}: ${upperRes.error.message}`;
      throw new CrackedError("FS_OVERLAY_MOUNT", {
        message,
        cause: upperRes.error,
      });
    }
    const workspaceRes = tryCatchSync(() => new Dir(workPath));
    if (workspaceRes.error) {
      const message = `${baseErrMsg}: ${workspaceRes.error.message}`;
      throw new CrackedError("FS_OVERLAY_MOUNT", {
        message,
        cause: workspaceRes.error,
      });
    }

    const cmd = [
      "mount",
      "-t",
      "overlay",
      "overlay",
      "-o",
      `lowerdir="${hostDir}"`,
      `upperdir="${upperRes.data.dir}"`,
      `workdir="${workspaceRes.data.dir}"`,
      guestDir,
    ];
    const proc = Bun.spawnSync(cmd, {
      timeout: 1000,
    });
    fsProcLogHelper(proc, cmd);
    if (proc.exitCode !== 0) {
      throw new CrackedError("FS_OVERLAY_MOUNT", {
        message: fsProcResultFormatter(cmd, proc, baseErrMsg),
      });
    }
    return new OverlayMount(hostDir, guestDir);
  };

  public destroy = () => {
    if (!isMountpoint(this.guestDir)) {
      fsLogger.info(
        `OverlayMount at ${this.guestDir} is not a mount point. Skipping destroy()`,
      );
      return;
    }

    const cmd = ["umount", "-l", this.guestDir];
    const proc = Bun.spawnSync(cmd, {
      timeout: 1000,
    });
    fsProcLogHelper(proc, cmd);
    if (proc.exitCode !== 0) {
      throw new CrackedError("FS_OVERLAY_MOUNT", {
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
