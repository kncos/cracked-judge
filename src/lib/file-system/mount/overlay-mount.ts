import { CrackedError } from "@/lib/judge-error";
import { tryCatchSync } from "@/lib/utils";
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

    const upperRes = tryCatchSync(() =>
      this.stack.use(new TempDir({ template: "" })),
    );
    if (upperRes.error) {
      const message = `${this.baseMountErr}: ${upperRes.error.message}`;
      fsLogger.error(message);
      throw new CrackedError("FS_OVERLAY_MOUNT", {
        message,
        cause: upperRes.error,
      });
    }

    const workspaceRes = tryCatchSync(() => this.stack.use(new TempDir()));
    if (workspaceRes.error) {
      const message = `${this.baseMountErr}: ${workspaceRes.error.message}`;
      fsLogger.error(message);
      throw new CrackedError("FS_OVERLAY_MOUNT", {
        message,
        cause: workspaceRes.error,
      });
    }

    const upper = upperRes.data.dir;
    const workspace = workspaceRes.data.dir;

    const cmd = [
      "mount",
      "-t",
      "overlay",
      "overlay",
      "-o",
      `lowerdir=${this.hostDir},upperdir=${upper},workdir=${workspace}`,
      this.guestDir,
    ];
    const proc = Bun.spawnSync(cmd, { timeout: 1000 });
    fsProcLogAndMaybeThrow(proc, cmd, "FS_OVERLAY_MOUNT", this.baseMountErr);
  }

  constructor(hostDir: string, guestDir: string) {
    super(hostDir, guestDir);

    try {
      this.create();
    } catch (e) {
      this.destroy();
      throw e;
    }
  }
}
