import { tryCatch } from "./utils";

export class AsyncDisposeError<K, E extends Error = Error> extends Error {
  override readonly name = "AsyncDisposeError";
  readonly type = "single" as const;
  declare readonly cause: [key: K, error: E];

  constructor(key: K, error: E) {
    super(`Failed to dispose of resource at key: ${String(key)}`, {
      cause: [key, error],
    });
    this.cause = [key, error];
  }
}

export class MultiAsyncDisposeError<K, E extends Error = Error> extends Error {
  override readonly name = "MultiAsyncDisposeError";
  readonly type = "multiple" as const;
  declare readonly cause: [key: K, error: E][];

  constructor(errors: AsyncDisposeError<K, E>[]) {
    super("Multiple disposal errors occurred", { cause: errors });
    this.cause = errors.map((e) => e.cause);
  }
}

export class AsyncDisposableMap<
  K,
  T extends AsyncDisposable,
> implements AsyncDisposable {
  //
  private resources: Map<K, T> = new Map();

  get size() {
    return this.resources.size;
  }

  entries() {
    return this.resources.entries();
  }
  keys() {
    return this.resources.keys();
  }
  values() {
    return this.resources.values();
  }

  async clear(): Promise<void> {
    const disposalPromises = Array.from(this.resources.keys()).map((k) =>
      this.delete(k),
    );
    const errors = (await Promise.allSettled(disposalPromises))
      .filter((r) => r.status === "rejected")
      .map((r) => r.reason as AsyncDisposeError<K>);
    if (errors.length !== 0) {
      throw new MultiAsyncDisposeError(errors);
    }
  }

  async delete(key: K): Promise<boolean> {
    const resource = this.resources.get(key);
    if (!resource) return false;
    try {
      await resource[Symbol.asyncDispose]();
    } catch (e) {
      // delete removes the key in a finally block, so even
      throw new AsyncDisposeError(key, e as Error);
    } finally {
      this.resources.delete(key);
    }
    return true;
  }

  get(key: K): T | undefined {
    return this.resources.get(key);
  }

  has(key: K): boolean {
    return this.resources.has(key);
  }

  async set(key: K, value: T): Promise<this> {
    const old = this.get(key);
    if (old !== undefined) {
      const { error } = await tryCatch(this.delete(key));
      // set key anyways but return error
      if (error) {
        this.resources.set(key, value);
        throw new AsyncDisposeError(key, error);
      }
    }
    this.resources.set(key, value);
    return this;
  }

  [Symbol.toStringTag]: string = "AsyncDisposableMap";

  async [Symbol.asyncDispose]() {
    await this.clear();
  }

  [Symbol.iterator]() {
    return this.resources[Symbol.iterator]();
  }
}
