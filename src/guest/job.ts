import { CrackedError } from "@/lib/cracked-error";
import { OverlayMount, RecursiveDir, TempDir } from "@/lib/file-system";
import { fileExists, fsProcLogAndMaybeThrow } from "@/lib/file-system/utils";
import type { zJob } from "@/server/schemas";
import { join } from "path";
import type z from "zod";

const driverDirs: Record<string, string> = {
  cpp: "/app/drivers/cpp",
  python: "/app/drivers/python",
};

class Job implements AsyncDisposable {
  private stack: AsyncDisposableStack = new AsyncDisposableStack();

  constructor(
    private readonly job: z.infer<typeof zJob>,
    private dir: string | null = null,
  ) {}

  get workdir() {
    return this.dir;
  }

  async create() {
    // a directory can be optionally provided. If it isn't provided,
    // a temp directory will be made. If it is provided, we just use that.
    if (this.dir === null) {
      const tempDir = new TempDir();
      this.stack.use(tempDir);
      this.dir = tempDir.dir;
    } else {
      const directory = new RecursiveDir(this.dir);
      this.stack.use(directory);
    }

    // drivers can be present sometimes, if not then its just a generic bash job
    const driver = driverDirs[this.job.lang];
    if (driver) {
      const driverMount = new OverlayMount(driver, this.dir);
      this.stack.use(driverMount);
    }

    // write file to disk -- since this is in either tempDir or provided dir,
    // this is removed during cleanup automatically
    const zipPath = join(this.dir, `${this.job.id}.zip`);
    try {
      await Bun.write(zipPath, this.job.file);
    } catch (e) {
      throw new CrackedError("FS_WRITE", {
        message: "Failed to write file when creating new job",
        cause: e,
      });
    }

    // unzip
    const cmd = ["unzip", zipPath];
    const proc = Bun.spawnSync(cmd, { timeout: 1000 });
    fsProcLogAndMaybeThrow(
      proc,
      cmd,
      "FS_UNZIP",
      `Failed to unzip file during job creation: ${zipPath}`,
    );
  }

  async execute() {
    if (this.dir === null) {
      throw new CrackedError("UNINITIALIZED", {
        message: "Cannot execute a job that is uninitialized",
      });
    }

    // script paths
    const compileScript = join(this.dir, "compile.sh");
    const runScript = join(this.dir, "run.sh");

    // compile script is optional (interpreted langauges don't use it)
    if (fileExists(compileScript)) {
      const cmd = [`/bin/bash`, compileScript];
      // highly generous timeout for now
      const compileProc = Bun.spawnSync(cmd, { timeout: 30000 });
      fsProcLogAndMaybeThrow(
        compileProc,
        cmd,
        "GUEST_COMPILE_FAILED",
        "Found compile script but encountered error during execution",
      );
    }

    // run script is mandatory
    if (fileExists(runScript)) {
      const cmd = [`/bin/bash`, runScript];
      const runProc = Bun.spawnSync(cmd, { timeout: 30000 });
      fsProcLogAndMaybeThrow(
        runProc,
        cmd,
        "GUEST_RUN_FAILED",
        "Found run script but encountered error during execution",
      );
    } else {
      throw new CrackedError("GUEST_MALFORMED_JOB", {
        message: "No run script found in job directory.",
      });
    }
  }

  async destroy() {
    await this.stack.disposeAsync();
  }

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}

export const createJob = async (
  ...params: ConstructorParameters<typeof Job>
) => {
  const j = new Job(...params);
  await j.create();
  return j;
};
