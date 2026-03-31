import { CrackedError } from "@/lib/judge-error";
import { fsLogger, fsProcLogAndMaybeThrow, isMountpoint } from "../utils";
import { BaseMount } from "./base-mount";

export class ReadonlyMount extends BaseMount {
  private create() {
    if (isMountpoint(this.guestDir)) {
      const message = `${this.baseMountErr}: "${this.guestDir}" is already a mountpoint`;
      fsLogger.error(message);
      throw new CrackedError("FS_READONLY_MOUNT", { message });
    }

    const cmd = ["mount", "--bind", "-o", "ro", this.hostDir, this.guestDir];
    const proc = Bun.spawnSync(cmd, { timeout: 1000 });
    fsProcLogAndMaybeThrow(proc, cmd, "FS_READONLY_MOUNT", this.baseMountErr);
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
