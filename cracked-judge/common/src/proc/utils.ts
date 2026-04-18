import type { Logger } from "pino";
import { CrackedError, type CrackedErrorCode } from "../lib/cracked-error";
import { exitCodeSignalMapping } from "../lib/signal";
import { indentStr } from "../lib/utils";

export const invokeCallback = async (params: {
  callback?: () => void | Promise<void>;
  onError?: (e: CrackedError) => void | Promise<void>;
  errorCode: CrackedErrorCode;
  errorMessage?: string;
}) => {
  const { callback, onError, errorCode, errorMessage } = params;
  if (!callback) return;

  try {
    await callback();
  } catch (e) {
    const error = new CrackedError(errorCode, {
      cause: e,
      message: errorMessage,
    });

    if (onError) {
      try {
        await onError(error);
      } catch (onErrorEx) {
        // error handler itself threw; this generally should never happen,
        // but if it does, we will normalize this error as well and re-throw
        throw new CrackedError("PROC_ERR_HANDLER_THREW", {
          cause: onErrorEx,
          message:
            "FATAL: Error handler threw! Error handler should never throw!\n" +
            `  Error message that invoked onError: ${errorMessage || "N/A"}\n` +
            `  Error code that invoked onError: ${errorCode}\n`,
        });
      }
    } else {
      // no error handler; just re-throw wrapped error
      throw error;
    }
  }
};

export function logAndReturn<E = CrackedError>(
  e: E,
  logger: Logger,
  silent: boolean = false,
): E {
  try {
    logAndRethrow(e, logger, silent);
  } catch (e) {
    return e as E;
  }
}

export function logAndRethrow(
  e: unknown,
  logger: Logger,
  silent: boolean = false,
): never {
  const log = silent ? logger.silent.bind(logger) : logger.error.bind(logger);

  if (e instanceof CrackedError) {
    log(
      [
        "Encountered CrackedError:",
        `  Message: ${e.message || "N/A"}`,
        `  Code: ${e.code}`,
      ].join("\n"),
    );
  } else if (e instanceof Error) {
    log(
      [
        "Encountered Generic Error:",
        "WARN: This handler usually expects CrackedError! Did you forget to wrap an error?",
        `  Message: ${e.message}`,
        `  Name (maybe meaningful): ${e.name}`,
      ].join("\n"),
    );
  } else {
    log("Encountered some unknown or unexpected type that isn't an Error");
  }

  throw e;
}
export interface Proc {
  pid: number;
  exitCode: number;
  stdout: Buffer;
  stderr: Buffer;
  exitedDueToTimeout?: boolean | undefined;
}

export function procLogHelper(proc: Proc, cmd: string[], logger: Logger) {
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
  } else if (exitCodeSignalMapping[exitCode] !== undefined) {
    logger.warn(ctx, `${baseMsg} ${exitCodeSignalMapping[exitCode]}`);
  } else {
    logger.error(ctx, baseMsg);
  }
}

export const procLogAndMaybeThrow = (
  proc: Proc,
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

export const procResultFormatter = (
  cmd: string[],
  proc: Proc,
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

export const procOutputParser = (input: Buffer, maxLen: number = 256) => {
  const text = input.toString();
  if (maxLen <= 0) return text;

  if (text.length < maxLen) return text;

  const truncatedEnd = `... (truncated ${text.length - maxLen} chars)`;
  return `${text.slice(0, maxLen - truncatedEnd.length)}${truncatedEnd}`;
};
