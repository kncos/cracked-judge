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

const bufferStream = async (
  stream: ReadableStream<Uint8Array<ArrayBuffer>>,
  logFunc: (input: string) => void,
) => {
  const decoder = new TextDecoder();
  let buffer = "";

  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop()!;
    for (const line of lines) {
      if (line.length > 0) {
        logFunc(line);
      }
    }
  }

  buffer += decoder.decode();
  if (buffer.length > 0) {
    logFunc(buffer);
  }
};

export const registerProcess = (params: {
  proc: Bun.Subprocess<"ignore", "pipe", "pipe">;
  logger: pino.Logger;
}) => {
  const { proc, logger } = params;

  bufferStream(proc.stdout, (input) => logger.debug(input));
  bufferStream(proc.stderr, (input) => logger.error(input));

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
