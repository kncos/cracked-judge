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
  label?: string;
}) => {
  const { proc, label = `[PID ${proc.pid}]` } = params;

  const procLogger = logger.child(
    {
      procPid: proc.pid || "ERROR: NO PID??",
      label,
      comment: "Spawned with bun.spawn",
    },
    { msgPrefix: label },
  );

  (async () => {
    const decoder = new TextDecoder();
    for await (const chunk of proc.stdout) {
      procLogger.debug(decoder.decode(chunk, { stream: true }));
    }

    const remainder = decoder.decode();
    if (remainder) {
      procLogger.debug(remainder);
    }
  })();
  (async () => {
    const decoder = new TextDecoder();
    for await (const chunk of proc.stderr) {
      procLogger.error(decoder.decode(chunk, { stream: true }));
    }

    const remainder = decoder.decode();
    if (remainder) {
      procLogger.error(remainder);
    }
  })();

  proc.exited.then((exitCode) => {
    if (exitCode === 0) {
      procLogger.debug("Process exited successfully with code 0.");
    } else {
      procLogger.error(`Process exited with code ${exitCode}.`);
    }
    const resource = proc.resourceUsage();
    if (resource) {
      procLogger.error("Resource usage unavailable!");
    } else {
      procLogger.debug(resource, "Resource usage:");
    }
  });
};
