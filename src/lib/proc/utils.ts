import type { Logger } from "pino";
import { CrackedError, type CrackedErrorCode } from "../judge-error";

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
  const log = silent ? logger.silent : logger.error;

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
