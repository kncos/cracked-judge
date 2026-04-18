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
  | "FS_ZIP"
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

  get prettyString() {
    return `${this.name} (${this.code}): ${this.message}`;
  }
}
