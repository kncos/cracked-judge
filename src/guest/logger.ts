import pino from "pino";
import pretty from "pino-pretty";

// TODO: remove pretty later on
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
