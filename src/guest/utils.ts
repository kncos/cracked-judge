import pino from "pino";
import pretty from "pino-pretty";

const prettyStream = pretty({
  colorize: true,
  sync: false,
});

export const guestLogger = pino(
  {
    level: "debug",
  },
  prettyStream,
);
