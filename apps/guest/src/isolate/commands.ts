import { fsProcLogHelper } from "@/lib/file-system/utils";
import { procLogAndMaybeThrow } from "@/lib/utils";
import { CrackedError } from "@cracked-judge/common";
import { readFileSync } from "node:fs";
import path from "path";
import type z from "zod";
import { guestLogger } from "../utils";
import type { JudgeStatus, zIsolateMeta, zIsolateRunOpts } from "./types";
import { interpretMeta, parseMeta } from "./utils";

// this is the default path template and is exactly what isolate init
// is returning, so we'll make the assumption that this will hold true for now
const getBoxPath = (boxId: number = 0) => `/var/lib/isolate/boxes/${boxId}`;

/**
 * Helper that runs the isolate --init command
 * @param boxid -- optional boxid to initialize, defaults to 0
 * @returns boxpath -- absolute path to the sandbox root directory
 */
export const init = (boxId: number = 0): string => {
  const cmd = ["isolate", "--cg", "--init", `--box-id=${boxId}`];
  const proc = Bun.spawnSync(cmd);
  procLogAndMaybeThrow(
    proc,
    cmd,
    "ISOLATE_INIT",
    "Failed to initialize isolate sandbox",
    guestLogger,
  );
  const boxpath = proc.stdout.toString().trim();
  // if the assumption breaks, we'll throw an error to prevent any path issues
  if (path.resolve(boxpath) !== path.resolve(getBoxPath(boxId))) {
    throw new CrackedError("ISOLATE_INIT", {
      message:
        "Isolate init created unexpected box path:\n" +
        `  Expected: ${getBoxPath(boxId)}\n` +
        `  Found: ${boxpath}`,
    });
  }

  return boxpath;
};

/**
 * Helper that runs the isolate --cleanup command
 * @param boxid -- optional boxid to clean up, defaults to 0
 */
export const cleanup = (boxid: number = 0) => {
  const cmd = ["isolate", "--cg", "--cleanup", `--box-id=${boxid}`];
  const proc = Bun.spawnSync(cmd);
  procLogAndMaybeThrow(
    proc,
    cmd,
    "ISOLATE_CLEANUP",
    "Failed to clean isolate sandbox",
    guestLogger,
  );
};

/**
 * Helper for running isolate's --run command.
 * @param runCmd command to execute under isolate. This could be a script, binary, etc.
 * @param params see zIsolateRunOpts
 * @returns
 */
export const run = (
  params: z.infer<typeof zIsolateRunOpts>,
): {
  stdout: string;
  stderr: string;
  metadata: z.infer<typeof zIsolateMeta>;
  status: JudgeStatus;
  message: string;
} => {
  // do this here to get the box path, but we won't rely on this.
  // with isolate, it's a no-op if init is run twice
  const boxPath = getBoxPath(params?.box_id);
  const metaPath = path.join(boxPath, "box", "metadata.out");
  const stdoutPath = path.join(boxPath, "box", "stdout.txt");
  const stderrPath = path.join(boxPath, "box", "stderr.txt");

  // always want these args
  const cmd = [
    "isolate",
    "--cg",
    "--run",
    "--dir=/nix/store/",
    "--dir=/run/current-system/sw",
    "--dir=/lib=",
    "--env=PATH=/run/current-system/sw/bin",
    `--meta=${metaPath}`,
    `--stdout=stdout.txt`,
    `--stderr=stderr.txt`,
  ];

  // just used `|| {}` here because it will cause a no-op but not
  // require this whole block to be nested in an if statement
  for (const [k, v] of Object.entries(params || {})) {
    // we use the same names but just replace all `_` with `-`
    // see: https://www.ucw.cz/isolate/isolate.1.html for args
    const kAsArg = `--${k.replaceAll("_", "-")}`;

    switch (k as keyof typeof params) {
      case "cmd":
        continue;
      case "time":
      case "cg_mem":
      case "wall_time":
      case "extra_time":
      case "stack":
      case "open_files":
      case "fsize":
      case "box_id":
        cmd.push(`${kAsArg}=${v as number}`);
        break;
      case "quota": {
        const { blocks, inodes } = v as NonNullable<(typeof params)["quota"]>;
        cmd.push(`${kAsArg}=${blocks},${inodes}`);
        break;
      }
      case "processes": {
        if (typeof v === "number") {
          cmd.push(`${kAsArg}=${v}`);
        }
        // if not a number, this can only be true. no check needed
        else {
          cmd.push(kAsArg);
        }
        break;
      }
    }
  }

  // separate isolate args from the command we're running using `--`
  cmd.push("--", ...params.cmd);

  // unused, we don't actually want to run logging on this because
  // it should just exit with a metadata file with the info we need
  const proc = Bun.spawnSync(cmd);

  // relevant information from the runtime
  try {
    const stdout = readFileSync(stdoutPath).toString("utf-8");
    const stderr = readFileSync(stderrPath).toString("utf-8");
    const metadata = parseMeta(readFileSync(metaPath).toString("utf-8"));
    return { stdout, stderr, metadata, ...interpretMeta(metadata) };
  } catch (e) {
    const ls = Bun.spawnSync(["ls", "-lR", "/var/lib/isolate/"]);
    fsProcLogHelper(proc, cmd);
    console.log("LS RESULT:", ls.stdout.toString(), ls.stderr.toString());
    throw e;
  }
};
