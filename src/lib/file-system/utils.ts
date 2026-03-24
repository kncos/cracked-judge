import * as Bun from "bun";
import { baseLogger } from "../logger";
import { indentStr } from "../utils";

export const isMountpoint = (dir: string) => {
  const proc = Bun.spawnSync(["mountpoint", "-q", dir]);
  return proc.exitCode === 0;
};
export const fsLogger = baseLogger.child({}, { msgPrefix: "[FileSys] " });

export const fsOutputParser = (input: Buffer, maxLen: number = 256) => {
  const decoder = new TextDecoder();
  const text = decoder.decode(input);
  if (maxLen <= 0) return text;

  if (text.length < maxLen) return text;

  const truncatedEnd = `... (truncated ${text.length - maxLen} chars)`;
  return `${text.slice(0, maxLen - truncatedEnd.length)}${truncatedEnd}`;
};

export const fsProcResultFormatter = (
  cmd: string[],
  proc: Bun.SyncSubprocess<"pipe", "pipe">,
  header?: string,
) => {
  const body = [
    `  command: ${cmd.join(" ")}`,
    `  exit code: ${proc.exitCode}`,
    `  pid: ${proc.pid}`,
    "  stdout:",
    indentStr(fsOutputParser(proc.stdout, 256), 1, ">   "),
    `  stderr:`,
    indentStr(fsOutputParser(proc.stderr, 256), 1, ">   "),
  ].join("\n");

  if (header) {
    return [header, body].join("\n");
  }
  return body;
};
// these are all failure modes for mount
const errorCodes = [1, 2, 4, 8, 16, 32, 64];
const signalExitCodes = {
  130: "SIGINT: Interrupted, did you hit ctrl+c?",
  135: "SIGBUS: Memory/alignment issue?",
  137: "SIGKILL: Process was forcefully killed",
  139: "SIGSEGV: Something went wrong internally to the process",
  141: "SIGPIPE: Broken pipe",
  143: "SIGTERM: Process was manually terminated",
};

export const fsProcLogHelper = (
  proc: Bun.SyncSubprocess<"pipe", "pipe">,
  cmd?: string[],
) => {
  const { exitCode, stdout, stderr, pid } = proc;
  const out = fsOutputParser(stdout);
  const err = fsOutputParser(stderr);
  const baseMsg = `Process ${pid} exited with code ${exitCode}.`;
  const ctx = cmd
    ? {
        out,
        err,
        cmd: cmd.join(" "),
      }
    : { out, err };

  if (exitCode === 0) {
    fsLogger.trace(baseMsg);
    // mount can OR exit codes together
  } else if (errorCodes.some((code) => (code & exitCode) === 0)) {
    fsLogger.error(ctx, baseMsg);
  } else if (signalExitCodes[exitCode] !== undefined) {
    fsLogger.warn(ctx, `${baseMsg} ${signalExitCodes[exitCode]}`);
  } else {
    fsLogger.warn(ctx, `${baseMsg} This is an unknown exit code`);
  }
};
