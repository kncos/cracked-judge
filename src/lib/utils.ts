import type { Logger } from "pino";
import { CrackedError, type CrackedErrorCode } from "./judge-error";

// Types for the result object with discriminated union
type Success<T> = {
  data: T;
  error: null;
};

type Failure<E> = {
  data: null;
  error: E;
};

type Result<T, E = Error> = Success<T> | Failure<E>;
// Main wrapper function

export async function tryCatch<T, E = Error>(
  promise: Promise<T>,
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as E };
  }
}

export function tryCatchSync<T, E = Error>(fn: () => T): Result<T, E> {
  try {
    return { data: fn(), error: null };
  } catch (error) {
    return { data: null, error: error as E };
  }
}

export const indentStr = (
  str: string,
  count: number = 1,
  indent: string = "  ",
) => {
  const _indent = indent.repeat(count);
  return str.replace(/^/gm, _indent);
};

export const procOutputParser = (input: Buffer, maxLen: number = 256) => {
  const decoder = new TextDecoder();
  const text = decoder.decode(input);
  if (maxLen <= 0) return text;

  if (text.length < maxLen) return text;

  const truncatedEnd = `... (truncated ${text.length - maxLen} chars)`;
  return `${text.slice(0, maxLen - truncatedEnd.length)}${truncatedEnd}`;
};

export const procResultFormatter = (
  cmd: string[],
  proc: Bun.SyncSubprocess<"pipe", "pipe">,
  header?: string,
) => {
  const body = [
    `  command: ${cmd.join(" ")}`,
    `  exit code: ${proc.exitCode}`,
    `  pid: ${proc.pid}`,
    `  timed out: ${proc.exitedDueToTimeout ?? false}`,
    "  stdout:",
    indentStr(procOutputParser(proc.stdout, 256), 1, ">   "),
    `  stderr:`,
    indentStr(procOutputParser(proc.stderr, 256), 1, ">   "),
  ].join("\n");

  if (header) {
    return [header, body].join("\n");
  }
  return body;
};

const signalExitCodes: Record<number, string> = {
  130: "SIGINT: Interrupted, did you hit ctrl+c?",
  135: "SIGBUS: Memory/alignment issue?",
  137: "SIGKILL: Process was forcefully killed",
  139: "SIGSEGV: Something went wrong internally to the process",
  141: "SIGPIPE: Broken pipe",
  143: "SIGTERM: Process was manually terminated",
};

export const procLogHelper = (
  proc: Bun.SyncSubprocess<"pipe", "pipe">,
  cmd: string[],
  logger: Logger,
) => {
  const { exitCode, stdout, stderr, pid } = proc;
  const out = procOutputParser(stdout);
  const err = procOutputParser(stderr);
  const baseMsg = `Process ${pid} exited with code ${exitCode}.`;
  const ctx = {
    out,
    err,
    cmd: cmd.join(" "),
  };

  if (exitCode === 0) {
    logger.trace(baseMsg);
  } else if (signalExitCodes[exitCode] !== undefined) {
    logger.warn(ctx, `${baseMsg} ${signalExitCodes[exitCode]}`);
  } else {
    logger.error(ctx, baseMsg);
  }
};

export const procLogAndMaybeThrow = (
  proc: Bun.SyncSubprocess<"pipe", "pipe">,
  cmd: string[],
  code: CrackedErrorCode,
  msg: string,
  logger: Logger,
) => {
  procLogHelper(proc, cmd, logger);
  if (proc.exitCode !== 0) {
    throw new CrackedError(code, {
      message: procResultFormatter(cmd, proc, msg),
    });
  }
};
