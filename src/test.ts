/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { DisposableRedis } from "./lib/redis-registry";

const test = async (signal?: AbortSignal) => {
  await using redis = new DisposableRedis();
  if (signal?.aborted) return null;

  let disconnected: boolean = false;

  const abort = () => {
    disconnected = true;
    redis.disconnect();
  };

  signal?.addEventListener("abort", abort, { once: true });

  try {
    const result = await redis.brpop("some-queue", 10);
    if (disconnected) {
      console.log("Disconnected");
      return;
    }

    console.log(result);
  } catch (error) {
    console.log("catching exception. disconnected:", disconnected);
    if (disconnected) return null;
    throw error;
  } finally {
    console.log("removing event listener");
    signal?.removeEventListener("abort", abort);
  }
};

const main = async () => {
  const controller = new AbortController();
  void test(controller.signal);

  await Bun.sleep(5000).then(() => {
    controller.abort();
  });

  return;
};
