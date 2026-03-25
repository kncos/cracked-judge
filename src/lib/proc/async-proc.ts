import type { Logger } from "pino";
import { CrackedError } from "../judge-error";
import { baseLogger } from "../logger";
import { invokeCallback, logAndRethrow } from "./utils";

type ProcessResult = {
  exitCode: number;
  signal: NodeJS.Signals | null;
  success: boolean;
};

type ProcessLoggerOptions = {
  logger: Logger;
  stdoutSilent: boolean;
  stderrSilent: boolean;
  exitSuccessSilent: boolean;
  exitFailureSilent: boolean;
  internalErrorSilent: boolean;
};

type ProcessCallbacks = Partial<{
  preStart: () => void | Promise<void>;
  postStart: () => void | Promise<void>;
  preExit: (proc: AsyncProc) => void | Promise<void>;
  postExit: (result: ProcessResult, proc: AsyncProc) => void | Promise<void>;
  onError: (e: CrackedError) => void | Promise<void>;
}>;

type AsyncProcParams = {
  cmd: string[];
} & ProcessCallbacks &
  Partial<ProcessLoggerOptions>;

type ProcessMeta = {
  cmd: string[];
  pid: number;
  destroyed: boolean;
};

export class AsyncProc implements AsyncDisposable {
  private constructor(
    private readonly proc: Bun.Subprocess<"ignore", "pipe", "pipe">,
    private readonly callbacks: ProcessCallbacks,
    private readonly loggerOpts: ProcessLoggerOptions,
    private readonly meta: ProcessMeta,
  ) {}

  static create = async (params: AsyncProcParams) => {
    const callbacks = {
      ...params,
    };
    const loggerOpts = {
      logger: baseLogger.child({}, { msgPrefix: "[AsyncProc] " }),
      stdoutSilent: false,
      stderrSilent: false,
      exitSuccessSilent: false,
      exitFailureSilent: false,
      internalErrorSilent: false,
      ...params,
    };

    let proc: Bun.Subprocess<"ignore", "pipe", "pipe">;
    try {
      await invokeCallback({
        callback: callbacks.preStart,
        errorCode: "PROC_PRE_START",
      });

      proc = Bun.spawn({
        cmd: params.cmd,
        stderr: "pipe",
        stdout: "pipe",
      });

      await invokeCallback({
        callback: callbacks.postStart,
        errorCode: "PROC_POST_START",
      });
    } catch (e) {
      logAndRethrow(e, loggerOpts.logger, loggerOpts.internalErrorSilent);
      return;
    }

    const meta = {
      ...params,
      pid: proc.pid,
      destroyed: false,
    };

    return new AsyncProc(proc, callbacks, loggerOpts, meta);
  };

  get exitResult(): ProcessResult | null {
    if (this.proc.exitCode === null) {
      return null;
    }
    const exitCode = this.proc.exitCode;
    const signal = this.proc.signalCode;
    const success = exitCode === 0 || signal === "SIGINT";
    return { exitCode, signal, success };
  }

  async getExitResult(): Promise<ProcessResult> {
    const exitCode = await this.proc.exited;
    const signal = this.proc.signalCode;
    const success = exitCode === 0 || signal === "SIGINT";
    return { exitCode, signal, success };
  }

  destroy = async () => {
    if (this.meta.destroyed) {
      this.loggerOpts.logger.debug("AsyncProc already destroyed");
    }

    const { preExit, postExit } = this.callbacks;

    try {
      await invokeCallback({
        callback: () => preExit?.(this),
        errorCode: "PROC_PRE_EXIT",
      });

      // might already be killed by preExit if that was the
      // graceful shutdown procedure
      if (!this.proc.killed) this.proc.kill("SIGTERM");
      const result = await this.getExitResult();

      await invokeCallback({
        callback: () => postExit?.(result, this),
        errorCode: "PROC_POST_EXIT",
      });
    } catch (e) {
      logAndRethrow(
        e,
        this.loggerOpts.logger,
        this.loggerOpts.internalErrorSilent,
      );
      return;
    }
  };

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}
