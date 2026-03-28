import { isReplyError } from "@/types/redis";
import type { Logger } from "pino";
import z, { ZodError } from "zod";
import { baseLogger } from "./logger";

export type CrackedErrorCode =
  | "PARSE_ERROR"
  | "REDIS_ERROR"
  | "OTHER"
  | "RESOURCE_DISPOSAL"
  | "FS_MKTEMP"
  | "FS_DIRECTORY"
  | "FS_MOUNT"
  | "FS_BIND_MOUNT"
  | "FS_OVERLAY_MOUNT"
  | "FS_CHOWN"
  | "FS_CHMOD"
  | "FS_DEPENDENCY_CHECK"
  | "PROC_SPAWN"
  | "PROC_PRE_CREATE"
  | "PROC_POST_CREATE"
  | "PROC_PRE_DESTROY"
  | "PROC_POST_DESTROY"
  | "PROC_ERR_HANDLER_THREW"
  | "PROC_PREMATURE_EXIT_HANDLER_THREW"
  | "PROC_UNINITIALIZED"
  | "PROC_OTHER"
  | "VM_FILESYS"
  | "VM_POOL"
  | "VM_CREATE"
  | "API_INTERNAL_ERROR";

export class CrackedError extends Error {
  public override readonly name: string = "CrackedError" as const;
  constructor(
    public readonly code: CrackedErrorCode,
    opts?: {
      message?: string;
      cause?: unknown;
    },
  ) {
    const { message = `CrackedError: ${code}`, cause } = opts || {};
    super(message, { cause });
  }
}

export const handleError = (
  cause: unknown,
  opts?: {
    overrideCode?: CrackedErrorCode;
    logger?: Logger;
    writeLog?: boolean;
    context?: Record<string, unknown>;
    comment?: string;
  },
): never => {
  const {
    logger = baseLogger.child({}, { msgPrefix: "[ErrorHandler] " }),
    writeLog = true,
    context,
    overrideCode,
    comment,
  } = opts || {};

  const ctx = {
    ...context,
    comment,
  };

  if (cause instanceof CrackedError) {
    // cracked errors can correct the code here
    const message = cause.message;
    if (writeLog) logger.error({ ...ctx }, cause.message);
    const code = overrideCode || cause.code;
    throw new CrackedError(code, { message, cause });
  } else if (cause instanceof ZodError) {
    // zod errors are PARSE_ERROR types
    const message = `Encountered ZodError: ${z.prettifyError(cause)}`;
    if (writeLog) logger.error({ ...ctx }, message);
    const code = overrideCode || "PARSE_ERROR";
    throw new CrackedError(code, { message, cause });
  } else if (isReplyError(cause)) {
    // ReplyError always comes from redis
    const message = `Encountered Redis Error (ReplyError): ${cause.message}`;
    if (writeLog) logger.error({ ...ctx }, message);
    const code = overrideCode || "REDIS_ERROR";
    throw new CrackedError(code, { message, cause });
  } else if (cause instanceof Error) {
    // generic error handling
    const message = `Encountered Unknown Error (${cause.name}?): ${cause.message}`;
    if (writeLog) logger.error({ ...ctx }, message);
    const code = overrideCode || "OTHER";
    throw new CrackedError(code, { message, cause });
  } else if (typeof cause === "string") {
    const message = cause;
    if (writeLog) logger.error({ ...ctx }, message);
    const code = overrideCode || "OTHER";
    throw new CrackedError(code, { message, cause });
  } else {
    const message = "Encountered unknown type in handleError. Not an Error?";
    if (writeLog) logger.error({ ...ctx, _cause: cause }, message);
    const code = overrideCode || "OTHER";
    throw new CrackedError(code, { message, cause });
  }
};
