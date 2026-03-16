import pino from "pino";
import { env } from "./env";

export const logger = pino({
  level: env.NODE_ENV === "development" ? "debug" : "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

export const registerProcess = (params: {
  proc: Bun.Subprocess<"ignore", "pipe", "pipe">;
  logger: pino.Logger;
}) => {
  const { proc, logger } = params;

  (async () => {
    const decoder = new TextDecoder();
    for await (const chunk of proc.stdout) {
      logger.debug(decoder.decode(chunk, { stream: true }));
    }

    const remainder = decoder.decode();
    if (remainder) {
      logger.debug(remainder);
    }
  })();
  (async () => {
    const decoder = new TextDecoder();
    for await (const chunk of proc.stderr) {
      logger.error(decoder.decode(chunk, { stream: true }));
    }

    const remainder = decoder.decode();
    if (remainder) {
      logger.error(remainder);
    }
  })();

  proc.exited.then((exitCode) => {
    if (exitCode === 0) {
      logger.debug("Process exited successfully with code 0.");
    } else {
      logger.error(`Process exited with code ${exitCode}.`);
    }
    const resource = proc.resourceUsage();
    if (resource === undefined || Object.keys(resource).length === 0) {
      logger.warn("Resource usage unavailable!");
    } else {
      logger.debug(resource, "Resource usage:");
    }
  });
};
