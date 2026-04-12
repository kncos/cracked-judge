import { procLogAndMaybeThrow, procLogHelper } from "@/lib/utils";
import * as Bun from "bun";
import { readFileSync } from "node:fs";
import path from "node:path";
import type z from "zod";
import { guestLogger } from "../utils";
import type { IsolateResult } from "./types";
import { zIsolateLimits, zIsolateMeta } from "./types";
import { getRunArgs, interpretMeta, parseMeta } from "./utils";

// re-export types
export { zIsolateLimits, zIsolateMeta, type IsolateResult };

// main function exposed by this api
export const runUnderIsolate = (params: {
  cmd: string[];
  limits?: z.input<typeof zIsolateLimits>;
  getPayload?: boolean;
}): IsolateResult => {
  const { cmd, limits, getPayload = false } = params;
  try {
    const initcmd = ["isolate", "--cg", "--init"];
    // throws if limits is invalid
    const runcmd = [...getRunArgs(limits), "--", ...cmd];

    const initproc = Bun.spawnSync(initcmd);
    procLogAndMaybeThrow(
      initproc,
      initcmd,
      "ISOLATE_INIT",
      "Failed to initialize sandbox",
      guestLogger,
    );

    // isolate's init command yields the absolute path to the box it created
    // here, we can find stdout.txt and stderr.txt
    const boxdir = path.join(initproc.stdout.toString().trim(), "box");
    const runproc = Bun.spawnSync(initcmd);
    procLogAndMaybeThrow(
      runproc,
      runcmd,
      "ISOLATE_RUN",
      "Isolate failed at runtime",
      guestLogger,
    );

    // aggregate data needed to build results
    const stdout = readFileSync(path.join(boxdir, "stdout.txt")).toString(
      "utf-8",
    );
    const stderr = readFileSync(path.join(boxdir, "stderr.txt")).toString(
      "utf-8",
    );
    const metadata = parseMeta(
      readFileSync("/root/metadata.out").toString("utf-8"),
    );

    const payloadPath = `/root/payload-${crypto.randomUUID()}.7z`;
    const payloadCmd = ["7z", "a", payloadPath];
    if (getPayload) {
      const payloadProc = Bun.spawnSync(payloadCmd);
      procLogAndMaybeThrow(
        payloadProc,
        payloadCmd,
        "FS_ZIP",
        "Failed to zip payload",
        guestLogger,
      );
    }

    return {
      ...interpretMeta(metadata),
      stdout,
      stderr,
      metadata,
      // if getPayload was specified, the archive will be created
      // at payloadPath and can just be accessed here
      payload: getPayload ? Bun.file(payloadPath) : undefined,
    };
  } finally {
    const cmd = ["isolate", "--cg", "--cleanup"];
    const proc = Bun.spawnSync(cmd);
    procLogHelper(proc, cmd, guestLogger);
  }
};
