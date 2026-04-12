import pino from "pino";
import pretty from "pino-pretty";

export type JudgeStatus = "IE" | "CE" | "RE" | "MLE" | "TLE" | "WA" | "AC";

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
