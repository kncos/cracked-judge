import { baseLogger } from "./logger";
import { tryCatchTimeout } from "./try-catch-timeout";

export const destroyWithLogging = async <T, U>(
  destroyMethod: () => Promise<T>,
  opts?: {
    timeoutMs?: number;
    label?: string;
    ctx?: Record<string, unknown>;
    onTimeout?: () => Promise<U>;
  },
) => {
  const { timeoutMs = 5000, label, ctx, onTimeout } = opts ?? {};

  const res = await tryCatchTimeout(destroyMethod(), timeoutMs, onTimeout);
  const { status, error } = res;
  const labelPrefix = label ? `[${label}] ` : "[cleanup] ";
  const logger = baseLogger.child({ ...ctx }, { msgPrefix: labelPrefix });

  switch (status) {
    case "success":
      logger.debug({ ...ctx }, `${labelPrefix}Resource successfully destroyed`);
      break;
    case "timeout":
      logger.warn(
        { ...ctx },
        `${labelPrefix}Resource still not destroyed after ${timeoutMs}ms`,
      );
      break;
    case "failure":
      logger.error(
        { ...ctx, errorMsg: error.message },
        `${labelPrefix}Failed to destroy resource`,
      );
      break;
  }
  return res;
};
