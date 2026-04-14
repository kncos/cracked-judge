import { CrackedError } from "@/lib/cracked-error";
import { fsLogger, fsProcLogAndMaybeThrow, isMountpoint } from "../utils";
import { BaseMount } from "./base-mount";

export class BindMount extends BaseMount {
  private create() {
    if (isMountpoint(this.guestDir)) {
      const message = `${this.baseMountErr}: "${this.guestDir}" is already a mountpoint`;
      fsLogger.error(message);
      throw new CrackedError("FS_BIND_MOUNT", { message });
    }

    const cmd = [
      "mount",
      "--bind",
      "--map-users",
      `0:${this.uid}:65534`,
      "--map-groups",
      `0:${this.gid}:65534`,
      this.hostDir,
      this.guestDir,
    ];
    const proc = Bun.spawnSync(cmd, { timeout: 1000 });
    fsProcLogAndMaybeThrow(proc, cmd, "FS_BIND_MOUNT", this.baseMountErr);
  }

  constructor(
    hostDir: string,
    guestDir: string,
    public readonly uid: string = "60000",
    public readonly gid: string = "60000",
  ) {
    super(hostDir, guestDir);
    try {
      this.create();
    } catch (e) {
      this.destroy();
      throw e;
    }
  }
}
