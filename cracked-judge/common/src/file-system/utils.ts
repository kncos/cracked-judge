import * as Bun from "bun";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { type CrackedErrorCode } from "..";
import { baseLogger } from "../lib/logger";
import { procLogAndMaybeThrow, procLogHelper } from "../proc";

export const isMountpoint = (dir: string) => {
  const proc = Bun.spawnSync(["mountpoint", "-q", dir]);
  return proc.exitCode === 0;
};

export const fsLogger = baseLogger.child({}, { msgPrefix: "[FileSys] " });

export const fsProcLogAndMaybeThrow = (
  proc: Bun.SyncSubprocess<"pipe", "pipe">,
  cmd: string[],
  code: CrackedErrorCode,
  msg: string,
) => {
  procLogAndMaybeThrow(proc, cmd, code, msg, fsLogger);
};

export const fsProcLogHelper = (
  proc: Bun.SyncSubprocess<"pipe", "pipe">,
  cmd: string[],
) => {
  procLogHelper(proc, cmd, fsLogger);
};

export const fileExists = (path: string) =>
  statSync(path, { throwIfNoEntry: false }) !== undefined;

export const dirInfo = (path: string): "nonexistant" | "empty" | "nonempty" => {
  try {
    const files = readdirSync(path);
    return files.length === 0 ? "empty" : "nonempty";
  } catch {
    return "nonexistant";
  }
};

/**
 * This utility returns the path to the first occurrence of the given file in the provided directories.
 * @param fileName Name of the file to search for
 * @param dirs A list of paths to search in. Precedence: first -> last
 * @returns `null` if file not found, otherwise `string` path to file.
 */
export const manualWhich = (
  fileName: string,
  dirs: string[],
): string | null => {
  for (const d of dirs) {
    const joined = path.join(d, fileName);
    if (fileExists(joined)) {
      return path.resolve(joined);
    }
  }
  return null;
};

/**
 * Quick unsafe helper to change ownership and permissions
 * @param opts Options:
 * - path, target path to perform operations on
 * - uid, provided directly to chown
 * - gid, provided directly to chown
 * - mod, provided directly to chmod
 * - recursive, if `true` adds `-R` flag to the commands
 */
export const changePerms = (opts: {
  path: string;
  uid?: string;
  gid?: string;
  mod?: string;
  recursive?: boolean;
}) => {
  const target = path.resolve(opts.path);
  const uid = opts.uid?.trim();
  const gid = opts.gid?.trim();
  const mod = opts.mod?.trim();
  const recursive = opts.recursive ?? false;
  if (uid || gid) {
    const cmd = ["chown"];
    if (recursive) {
      cmd.push("-R");
    }

    if (uid && gid) {
      cmd.push(`${uid}:${gid}`);
    } else if (uid) {
      cmd.push(uid);
    } else if (gid) {
      cmd.push(`:${gid}`);
    }

    cmd.push(target);

    const proc = Bun.spawnSync(cmd, { timeout: 1000 });
    fsProcLogAndMaybeThrow(
      proc,
      cmd,
      "FS_CHOWN",
      `Failed to change ownership of ${target}`,
    );
  }

  if (mod) {
    const cmd = ["chmod"];
    if (recursive) {
      cmd.push("-R");
    }
    cmd.push(mod, target);
    const proc = Bun.spawnSync(cmd, { timeout: 1000 });
    fsProcLogAndMaybeThrow(
      proc,
      cmd,
      "FS_CHMOD",
      `Failed to change mode (to ${mod}) of ${target}`,
    );
  }
};
