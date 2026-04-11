import { isReplyError } from "@/types/redis";
import type { Logger } from "pino";
import z, { ZodError } from "zod";
import { baseLogger } from "./logger";

export type CrackedErrorCode =
  | "API_INTERNAL_ERROR"
  | "CONFIG_ERROR"
  | "FS_BIND_MOUNT"
  | "FS_CHMOD"
  | "FS_CHOWN"
  | "FS_DEPENDENCY_CHECK"
  | "FS_DIRECTORY"
  | "FS_MKTEMP"
  | "FS_MOUNT"
  | "FS_OVERLAY_MOUNT"
  | "FS_READONLY_MOUNT"
  | "FS_TEMP_FILE"
  | "FS_UNZIP"
  | "FS_WRITE"
  | "GUEST_COMPILE_FAILED"
  | "GUEST_MALFORMED_JOB"
  | "GUEST_RUN_FAILED"
  | "ISOLATE_CLEANUP"
  | "ISOLATE_INIT"
  | "ISOLATE_RUN"
  | "OTHER"
  | "PARSE_ERROR"
  | "PROC_ERR_HANDLER_THREW"
  | "PROC_OTHER"
  | "PROC_POST_CREATE"
  | "PROC_POST_DESTROY"
  | "PROC_PRE_CREATE"
  | "PROC_PRE_DESTROY"
  | "PROC_PREMATURE_EXIT_HANDLER_THREW"
  | "PROC_SPAWN"
  | "REDIS_ERROR"
  | "RESOURCE_DISPOSAL"
  | "UNINITIALIZED"
  | "VM_CREATE"
  | "VM_FILESYS"
  | "VM_POOL";

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
