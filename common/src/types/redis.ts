import "ioredis";
import Redis, { ReplyError } from "ioredis";
import { baseLogger } from "../lib/logger";
import { tryCatch } from "../lib/utils";

declare module "ioredis" {
  export interface ReplyError extends Error {
    readonly name: "ReplyError";
    readonly command?: {
      name: string;
      args: string[];
    };
  }
}

export const isReplyError = (error: unknown): error is ReplyError => {
  if (error === null || error === undefined || typeof error !== "object")
    return false;

  if ("name" in error && error.name === "ReplyError") return true;
  if (error instanceof ReplyError) return true;

  return false;
};

export class DisposableRedis extends Redis {
  async [Symbol.asyncDispose]() {
    if (this.status === "end") {
      return;
    }

    const { error } = await tryCatch(
      Promise.race([
        Bun.sleep(3000).then(() => {
          this.disconnect();
        }),
        this.quit(),
      ]),
    );
    if (error) {
      baseLogger.warn(
        { errorMsg: error.message },
        "Exception while cleaning up redis in async dispose",
      );
    }
  }
}
