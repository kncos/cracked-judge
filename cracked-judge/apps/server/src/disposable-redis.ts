import { tryCatch } from "@cracked-judge/common";
import Redis from "ioredis";
import { redisLogger } from "./lib/logger";

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
      redisLogger.warn(
        { errorMsg: error.message },
        "Exception while cleaning up redis in async dispose",
      );
    }
  }
}
