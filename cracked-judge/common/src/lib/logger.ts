import pino from "pino";
import pretty from "pino-pretty";

const prettyStream = pretty({
  colorize: true,
  sync: true,
});

export const baseLogger = pino(
  {
    level: "debug",
  },
  prettyStream,
);

//export const baseLogger = pino(
//  {
//    level: "trace",
//  },
//  {
//    write: (input) => {
//      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
//      const obj = JSON.parse(input);
//      const { level, time, pid, hostname, msg, ...rest } = obj;
//
//      const lines = [`${msg}\n`];
//      if (Object.keys(rest).length > 0) {
//        lines.push(`${indentStr(JSON.stringify(rest, null, 2))}\n`);
//      }
//      process.stdout.write(lines.join("\n"));
//    },
//  },
//);

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
