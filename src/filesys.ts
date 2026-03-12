import { chmod, chown, mkdir } from "node:fs/promises";

async function mkpath(
  path: string,
  opts?: {
    mode?: number;
    uid?: number;
    gid?: number;
  },
) {
  try {
    await mkdir(path, opts);
  } catch (e) {
    if (e.code === "EEXIST") {
      await chown(path, opts.uid, opts.gid);
      await chmod(path, opts.mode);
    } else {
      throw e;
    }
  }
}
