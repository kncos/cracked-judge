import { writeFileSync } from "fs";
import { CrackedError } from "../..";
import { fsLogger, fsProcLogAndMaybeThrow } from "../utils";

export class TempFile implements AsyncDisposable, Disposable {
  public readonly path: string;

  constructor(path: string, content: string) {
    this.path = path;

    try {
      writeFileSync(path, content);
      fsLogger.info(`TempFile created at ${path}`);
    } catch (e) {
      if (e instanceof CrackedError) throw e;
      throw new CrackedError("FS_TEMP_FILE", {
        message: `Failed to create temp file at ${path}`,
        cause: e,
      });
    }
  }

  public readonly destroy = () => {
    try {
      const cmd = ["rm", "-f", this.path];
      const proc = Bun.spawnSync(cmd, { timeout: 1000 });
      fsProcLogAndMaybeThrow(
        proc,
        cmd,
        "FS_TEMP_FILE",
        `Failed to remove temp file at ${this.path}`,
      );
      fsLogger.info(`TempFile removed at ${this.path}`);
    } catch (e) {
      if (e instanceof CrackedError) throw e;
      throw new CrackedError("FS_TEMP_FILE", {
        message: `Failed to remove temp file at ${this.path}`,
        cause: e,
      });
    }
  };

  [Symbol.dispose]() {
    try {
      this.destroy();
    } catch (e) {
      throw new CrackedError("RESOURCE_DISPOSAL", {
        message: `Failed to dispose TempFile at ${this.path}`,
        cause: e,
      });
    }
  }

  [Symbol.asyncDispose]() {
    this[Symbol.dispose]();
    return Promise.resolve();
  }
}
