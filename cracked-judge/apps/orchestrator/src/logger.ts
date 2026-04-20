import pino from "pino";
import pretty from "pino-pretty";

const prettyStream = pretty({
  colorize: true,
  sync: true,
});

export const vmLogger = pino(
  {
    level: "debug",
    msgPrefix: "[vm-pool] ",
  },
  prettyStream,
);
