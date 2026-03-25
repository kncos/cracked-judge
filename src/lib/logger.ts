import pino from "pino";

export const baseLogger = pino({
  level: "trace",
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
    buffer = lines.pop() || "";
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

//TODO: revisit this, maybe make it a util
export const registerAsyncProc = (params: {
  proc: Bun.Subprocess<"ignore", "pipe", "pipe">;
  logger: pino.Logger;
}) => {
  const { proc, logger } = params;

  const procLogger = logger.child(
    {},
    { msgPrefix: `(pid ${String(proc.pid)}) ` },
  );

  void bufferStream(proc.stdout, (input) => {
    procLogger.trace(input);
  });
  void bufferStream(proc.stderr, (input) => {
    procLogger.warn(input);
  });

  void proc.exited.then((exitCode) => {
    if (exitCode === 0) {
      procLogger.debug("Process exited successfully with code 0.");
    } else if (exitCode === 143) {
      procLogger.debug("Process exited successfully with SIGTERM");
    } else {
      procLogger.warn(`Process exited with code ${String(exitCode)}.`);
    }
  });
};
