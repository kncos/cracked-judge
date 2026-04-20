import type { Logger } from "pino";
import { CrackedError } from "../lib/cracked-error";
import { baseLogger, bufferStream } from "../lib/logger";
import { exitCodeSignalMapping } from "../lib/signal";
import { invokeCallback, logAndRethrow } from "./utils";

type ProcessResult = {
  pid: number;
  exitCode: number;
  signal: NodeJS.Signals | null;
  success: boolean;
};

const getSubprocessResult = (proc: Bun.Subprocess): ProcessResult | null => {
  if (proc.exitCode === null) {
    return null;
  }
  const exitCode = proc.exitCode;
  const signal = proc.signalCode;
  const success = exitCode === 0 || signal === "SIGINT";
  return { exitCode, signal, success, pid: proc.pid };
};

const waitForSubprocessResult = async (
  proc: Bun.Subprocess,
): Promise<ProcessResult> => {
  const exitCode = await proc.exited;
  const signal = exitCodeSignalMapping[exitCode] ?? null;
  const success = exitCode === 0 || signal === "SIGINT";
  return { exitCode, signal, success, pid: proc.pid };
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
  preCreate: () => void | Promise<void>;
  postCreate: () => void | Promise<void>;
  preDestroy: (proc: AsyncProc) => void | Promise<void>;
  postDestroy: (result: ProcessResult, proc: AsyncProc) => void | Promise<void>;
  onPrematureExit: (
    result: ProcessResult,
    proc: AsyncProc,
  ) => void | Promise<void>;
  onError: (e: CrackedError) => void | Promise<void>;
}>;

type AsyncProcParams = {
  cmd: readonly string[];
  killSignal?: NodeJS.Signals;
  killTimeoutBeforeSigkill?: number;
} & ProcessCallbacks &
  Partial<ProcessLoggerOptions>;

const throwUninitializedErr = (): never => {
  throw new CrackedError("UNINITIALIZED", {
    message:
      "You're trying to call a method on an uninitialized process. " +
      "Did you forget to call `create()` before using this resource?",
  });
};

export class AsyncProc implements AsyncDisposable {
  // null until created
  private proc: Bun.Subprocess<"ignore", "pipe", "pipe"> | null = null;
  private isDestroyed: boolean = false;
  private isPrematureExit: boolean = false;

  public readonly cmd: readonly string[];
  private readonly callbacks: ProcessCallbacks;
  private readonly loggerOpts: ProcessLoggerOptions;
  private readonly killSignal: NodeJS.Signals;
  private readonly killTimeoutBeforeSigkill: number;

  public constructor(params: AsyncProcParams) {
    this.callbacks = {
      ...params,
    };
    this.loggerOpts = {
      logger: baseLogger.child({}, { msgPrefix: "[AsyncProc] " }),
      stdoutSilent: false,
      stderrSilent: false,
      exitSuccessSilent: false,
      exitFailureSilent: false,
      internalErrorSilent: false,
      ...params,
    };
    this.cmd = params.cmd;
    this.killSignal = params.killSignal ?? "SIGTERM";
    this.killTimeoutBeforeSigkill = params.killTimeoutBeforeSigkill ?? 3000;
  }

  get pid() {
    return this.proc?.pid ?? throwUninitializedErr();
  }

  private callPostCreate = async () => {
    const { postCreate, onError } = this.callbacks;
    if (!this.isPrematureExit && postCreate !== undefined) {
      await invokeCallback({
        callback: postCreate,
        errorCode: "PROC_POST_CREATE",
        onError,
      });
    } else if (postCreate !== undefined) {
      this.loggerOpts.logger.warn(
        { cmd: this.cmd },
        "Skipping postCreate callback on process because it prematurely exited.",
      );
    }
  };

  private callPreDestroy = async () => {
    const { preDestroy, onError } = this.callbacks;
    if (!this.isPrematureExit && preDestroy !== undefined) {
      await invokeCallback({
        callback: () => preDestroy?.(this),
        errorCode: "PROC_PRE_DESTROY",
        onError,
      });
    } else if (preDestroy !== undefined) {
      this.loggerOpts.logger.warn(
        { cmd: this.cmd },
        "Skipping preDestroy callback on process because it prematurely exited.",
      );
    }
  };

  create = async () => {
    if (this.proc !== null) {
      return;
    }

    try {
      const { preCreate, onPrematureExit, onError } = this.callbacks;

      await invokeCallback({
        callback: preCreate,
        errorCode: "PROC_PRE_CREATE",
        onError,
      });

      const {
        stdoutSilent,
        stderrSilent,
        logger,
        exitFailureSilent,
        exitSuccessSilent,
      } = this.loggerOpts;
      const onExit = async (result: ProcessResult) => {
        if (!this.isDestroyed) {
          this.isPrematureExit = true;
          await invokeCallback({
            callback: () => onPrematureExit?.(result, this),
            errorCode: "PROC_PREMATURE_EXIT_HANDLER_THREW",
            onError,
          });
        }
        const log = result.success
          ? exitSuccessSilent
            ? logger.silent.bind(logger)
            : logger.debug.bind(logger)
          : exitFailureSilent
            ? logger.silent.bind(logger)
            : logger.error.bind(logger);
        log(
          `Process exited ` +
            (result.success ? "successfully" : "unsuccessfully") +
            (result.signal
              ? ` with signal ${result.signal} (exit code ${result.exitCode})`
              : ` with exit code ${result.exitCode}.`),
        );
      };

      const command = this.cmd;
      this.proc = Bun.spawn({
        // fixes type err with readonly
        cmd: [...this.cmd],
        stderr: "pipe",
        stdout: "pipe",
        detached: true,
        async onExit(subprocess) {
          console.error(`Process has exited: ${command}`);
          // TODO: handle hang?
          // note: onExit can be called before the subprocess has even exited (timing/race condition).
          // Furthermore, the process.exited promise can resolve while .exitCode and .signal are still null
          const res = await waitForSubprocessResult(subprocess);
          if (res === null) {
            throw new CrackedError("PROC_OTHER", {
              message:
                "Something went wrong with Bun.spawn? recieved unresolved subprocess in onExit",
            });
          }

          await onExit(res);
        },
      });

      // redirects incoming data from the buffers to the logger
      if (!stdoutSilent) {
        void bufferStream(this.proc.stdout, (m) => {
          logger.trace(m);
        });
      }
      if (!stderrSilent) {
        void bufferStream(this.proc.stderr, (m) => {
          logger.warn(m);
        });
      }

      await this.callPostCreate();
    } catch (e) {
      return logAndRethrow(
        e,
        this.loggerOpts.logger,
        this.loggerOpts.internalErrorSilent,
      );
    }
  };

  get exitResult(): ProcessResult | null {
    const proc = this.proc ?? throwUninitializedErr();
    return getSubprocessResult(proc);
  }

  async getExitResult(): Promise<ProcessResult> {
    const proc = this.proc ?? throwUninitializedErr();
    return await waitForSubprocessResult(proc);
  }

  destroy = async () => {
    const proc = this.proc ?? throwUninitializedErr();

    if (this.isDestroyed) {
      return;
    }
    // set to true here because callPreDestroy
    this.isDestroyed = true;
    const { logger } = this.loggerOpts;
    logger.debug("Destroying AsyncProc...");

    // Generally speaking, the process should be killed by the destroy() method. The exception
    // is when the process prematurely exits. If this state is encountered, it probably indicates
    // a programmer error where isPrematureExit was not properly set on the onExit() callback
    if (proc.killed && !this.isPrematureExit) {
      this.loggerOpts.logger.warn(
        { cmd: this.cmd },
        "Encountered a process that has already been killed, but not marked as premature exit",
      );
    }

    try {
      // pre-destroy subroutine; handles logging & premature exit state
      await this.callPreDestroy();

      if (!proc.killed) {
        proc.kill(this.killSignal);
        const timer = setTimeout(() => {
          proc.kill("SIGKILL");
        }, this.killTimeoutBeforeSigkill);

        await proc.exited;
        clearTimeout(timer);
      }
      const result = await this.getExitResult();

      const { postDestroy, onError } = this.callbacks;
      await invokeCallback({
        callback: () => postDestroy?.(result, this),
        errorCode: "PROC_POST_DESTROY",
        onError,
      });
    } catch (e) {
      return logAndRethrow(
        e,
        this.loggerOpts.logger,
        this.loggerOpts.internalErrorSilent,
      );
    }
  };

  async [Symbol.asyncDispose]() {
    await this.destroy();
    this.loggerOpts.logger.info({ cmd: this.cmd }, `Tore down process`);
  }
}
