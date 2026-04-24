import { WorkerClient } from "@cracked-judge/common/contract";
import { guestLogger } from "./utils";

const main = async () => {
  using wc = await WorkerClient.create("https://localhost:3000");
  const client = wc.client;

  while (true) {
    const start = Date.now();
    const job = await client.request();
    if (job === null) {
      const end = Date.now();
      guestLogger.debug(`Received null job after ${start - end}ms.`);
      continue;
    }
  }
};

void main();
