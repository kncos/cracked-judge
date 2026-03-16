import type pino from "pino";

export async function pollUntil<T>(
  fn: () => Promise<T>,
  predicate: (result: T) => boolean,
  options: {
    timeoutMs: number;
    intervalMs: number;
    maxRetries?: number;
    logger?: pino.Logger;
  },
): Promise<T> {
  const startTime = Date.now();
  let attempts = 0;

  while (Date.now() - startTime < options.timeoutMs) {
    try {
      const result = await fn();
      if (predicate(result)) {
        return result;
      }
    } catch (err) {
      if (options.logger) {
        options.logger.warn("Polling attempt failed, retrying...");
      }
    }

    attempts += 1;
    if (options.maxRetries && attempts >= options.maxRetries) {
      throw new Error(`Max retries (${options.maxRetries}) reached`);
    }
    await Bun.sleep(options.intervalMs);
  }

  throw new Error(`Polling timed out after ${options.timeoutMs}ms`);
}
