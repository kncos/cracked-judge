import Redis from "ioredis";
import { AsyncDisposableMap } from "./AsyncDisposableMap";
import { logger } from "./logger";
import { tryCatch } from "./utils";

export class DisposableRedis extends Redis {
  async [Symbol.asyncDispose]() {
    const { error } = await tryCatch(this.quit());
    if (error) {
      logger.error(
        { errorMsg: error.message },
        "Error cleaning up redis in async dispose",
      );
    }
  }
}

export class RedisRegistry implements AsyncDisposable {
  // this map automatically calls clear when we have `using` syntax,
  // and its `clear/delete` functions appropriately call the async dispose method
  private map: AsyncDisposableMap<string, DisposableRedis> =
    new AsyncDisposableMap();

  allocate(redisParams: ConstructorParameters<typeof DisposableRedis>) {
    const hash = crypto.randomUUID();
    this.map.set(hash, new DisposableRedis(...redisParams));
    return hash;
  }

  deallocate(hash: string) {
    this.map.delete(hash);
  }

  async destroy() {
    await this.map.clear();
  }

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}
