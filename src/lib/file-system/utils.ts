import * as Bun from "bun";
import { statSync } from "node:fs";
import { type CrackedErrorCode } from "../judge-error";
import { baseLogger } from "../logger";
import { procLogAndMaybeThrow, procLogHelper } from "../utils";

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
) => procLogAndMaybeThrow(proc, cmd, code, msg, fsLogger);

export const fsProcLogHelper = (
  proc: Bun.SyncSubprocess<"pipe", "pipe">,
  cmd: string[],
) => procLogHelper(proc, cmd, fsLogger);

export const fileExists = (path: string) =>
  statSync(path, { throwIfNoEntry: false }) !== undefined;
