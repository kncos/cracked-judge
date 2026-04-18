import type { zJob } from "@cracked-judge/common/contract";
import { fileExists } from "@cracked-judge/common/file-system";
import { procLogHelper } from "@cracked-judge/common/proc";
import * as Bun from "bun";
import path from "node:path";
import type z from "../node_modules/zod/v4/classic/external.d.cts";
import { isolate } from "./isolate/commands";
import type { IsolateResult } from "./isolate/types";
import { guestLogger } from "./utils";

//! What happens to stdout.txt and stderr.txt if we do subsequent runs?
//! case 1: overwritten -- fine
//! case 2: appended -- not fine, needs handled

export type PrepareResult =
  | { success: false; message: string }
  | { success: true; boxPath: string };

export const prepareJob = async (
  job: z.infer<typeof zJob>,
): Promise<PrepareResult> => {
  const boxPath = isolate.init();
  const filesPath = path.join(boxPath, "box", "files.zip");
  const totalBytes = await Bun.write(filesPath, job.files);
  guestLogger.debug(`Wrote ${totalBytes / 1024} KiB to ${filesPath}`);
  // unzip flat
  const cmd = ["unzip", "-o", filesPath, "-d", path.dirname(filesPath)];
  const proc = Bun.spawnSync(cmd);
  procLogHelper(
    proc,
    cmd,
    guestLogger.child({}, { msgPrefix: "unzip proc: " }),
  );
  if (proc.exitCode !== 0) {
    const message = "unzip returned non-zero, cleaning up and continuing...";
    guestLogger.debug(message);
    isolate.cleanup();
    return { success: false, message };
  }
  return { success: true, boxPath };
};

export type IsolateRunResult =
  | { status: "skipped"; res?: undefined }
  | { status: "success" | "failed"; res: IsolateResult };

export const runBoxScript = (realScriptPath: string): IsolateRunResult => {
  const res = fileExists(realScriptPath)
    ? isolate.run({ cmd: ["/bin/sh", "run.sh"] })
    : undefined;

  if (!res) {
    return { status: "skipped" };
  } else if (res.status !== "AC") {
    return { status: "failed", res };
  } else {
    return { status: "success", res };
  }
};

export type ZipSandboxResult =
  | { status: "success"; payload: File }
  | { status: "failed"; message: string; payload?: undefined }
  | { status: "skipped"; payload?: undefined };
export const zipSandbox = (
  boxPath: string,
  getPayload: boolean,
): ZipSandboxResult => {
  if (!getPayload) {
    return { status: "skipped" };
  }

  const payloadDir = path.join(boxPath, "box");
  const zipFileName = "payload.zip";
  const cmd = ["zip", zipFileName, "-r", "*", "-x", '"*.zip"'];
  const proc = Bun.spawnSync(cmd, { cwd: payloadDir });
  if (proc.exitCode !== 0) {
    procLogHelper(proc, cmd, guestLogger);
    return {
      status: "failed",
      message:
        `zip process exited with code ${proc.exitCode}.\n` +
        `STDOUT: ${proc.stdout.toString("utf-8")}\n` +
        `STDERR: ${proc.stderr.toString("utf-8")}`,
    };
  }

  const bunFile = Bun.file(path.join(payloadDir, zipFileName));
  return {
    status: "success",
    payload: new File([bunFile], zipFileName),
  };
};
