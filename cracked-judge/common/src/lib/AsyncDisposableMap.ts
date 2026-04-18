import { CrackedError, handleError } from "./cracked-error";
import { tryCatch } from "./utils";

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
    try {
      const results = await Promise.allSettled(disposalPromises);
      const failures = results
        .filter((r) => r.status === "rejected")
        .map((r) => {
          if (r.reason instanceof Error) {
            return r.reason.message;
          } else if (typeof r.reason === "string") {
            return r.reason;
          }
          return `Unknown failure mode?`;
        });
      if (failures.length > 0) {
        throw new CrackedError("RESOURCE_DISPOSAL", {
          message: failures.join("\n"),
        });
      }
    } catch (e) {
      handleError(e, {
        // overrideCode: "RESOURCE_DISPOSAL",
        comment: "Failed to dispose of resources in AsyncDisposableMap",
      });
    }
  }

  async delete(key: K): Promise<boolean> {
    const resource = this.resources.get(key);
    if (!resource) return false;
    try {
      await resource[Symbol.asyncDispose]();
    } catch (e) {
      handleError(e, { overrideCode: "RESOURCE_DISPOSAL" });
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
        handleError(error, { overrideCode: "RESOURCE_DISPOSAL" });
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
