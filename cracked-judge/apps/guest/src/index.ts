import { WorkerClient } from "@cracked-judge/common/contract";
import { env } from "./env";
import { handleJob } from "./job";
import { guestLogger } from "./utils";

const main = async () => {
  using wc = await WorkerClient.create(env.JUDGE_SERVER_URL);
  const client = wc.client;

  while (true) {
    const start = Date.now();
    try {
      const job = await client.request();

      if (job === null) {
        const end = Date.now();
        guestLogger.debug(`Received null job after ${start - end}ms.`);
        continue;
      }

      const res = await handleJob(job);
      await client.submit(res);
    } catch (e) {
      guestLogger.error(`Encountered exception: ${e}\nContinuing...`);
    }
  }
};

void main();
