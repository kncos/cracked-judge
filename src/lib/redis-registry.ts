import Redis from "ioredis";
import { AsyncDisposableMap } from "./AsyncDisposableMap";
import { baseLogger } from "./logger";
import { tryCatch } from "./utils";

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

export class RedisRegistry implements AsyncDisposable {
  // this map automatically calls clear when we have `using` syntax,
  // and its `clear/delete` functions appropriately call the async dispose method
  private map: AsyncDisposableMap<string, DisposableRedis> =
    new AsyncDisposableMap();

  async allocate() {
    const hash = crypto.randomUUID();
    await this.map.set(hash, new DisposableRedis());
    return hash;
  }

  async deallocate(hash: string) {
    await this.map.delete(hash);
  }

  get(hash: string) {
    return this.map.get(hash);
  }

  async destroy() {
    await this.map.clear();
  }

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}
