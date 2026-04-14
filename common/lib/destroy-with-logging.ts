import { handleError } from "./cracked-error";
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
  const labelPrefix = label ? `[${label}] ` : "[Cleanup] ";
  const logger = baseLogger.child({ ...ctx }, { msgPrefix: labelPrefix });

  switch (status) {
    case "success":
      logger.debug({ ...ctx }, `Resource successfully destroyed`);
      break;
    case "timeout":
      logger.warn(
        { ...ctx },
        `Resource still not destroyed after ${timeoutMs}ms`,
      );
      break;
    case "failure":
      return handleError(error, {
        overrideCode: "RESOURCE_DISPOSAL",
        logger,
      });
  }
  return res;
};
