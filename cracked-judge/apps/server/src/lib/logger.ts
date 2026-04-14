import pino from "pino";
import pretty from "pino-pretty";

const prettyStream = pretty({
  colorize: true,
  sync: false,
});

export const serverLogger = pino(
  {
    level: "debug",
    msgPrefix: "[server] ",
  },
  prettyStream,
);

export const redisLogger = pino(
  {
    level: "debug",
    msgPrefix: "[redis] ",
  },
  prettyStream,
);
