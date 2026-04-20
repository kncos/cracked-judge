import ADS from "disposablestack/AsyncDisposableStack/implementation";
import { setTimeout } from "timers/promises";
globalThis.AsyncDisposableStack = ADS;

class SomeResource implements AsyncDisposable {
  constructor(
    public readonly label: string,
    public readonly wait: number,
  ) {}

  async [Symbol.asyncDispose]() {
    console.error(`Destroying ${this.label}`);
    // Native Node.js async sleep
    await setTimeout(this.wait);
    console.error(`Destroyed ${this.label}`);
  }
}

async function test() {
  const stack = new AsyncDisposableStack();

  // LIFO Order: r3 will be destroyed first, then r2, then r1
  stack.use(new SomeResource("r1", 100));
  stack.use(new SomeResource("r2", 2000));
  stack.use(new SomeResource("r3", 100));

  console.log("--- Starting Disposal ---");
  const start = Date.now();

  await stack.disposeAsync();

  const end = Date.now();
  console.log(`--- Disposal Complete in ${end - start}ms ---`);
}

async function vmTest() {}

test().catch(console.error);
