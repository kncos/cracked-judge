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

export const bufferStream = async (
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
