import { tryCatch } from "../lib/utils";
import { vmClient } from "../server/client";

const main = async () => {
  while (true) {
    await Bun.sleep(1000);
    console.log("waiting for job...");
    const { data, error } = await tryCatch(vmClient.requestJob());
    if (error) {
      console.error("Error:", error);
      await Bun.sleep(1000);
      continue;
    }

    if (!data) {
      continue;
    }

    // await using job = await createJob(data);
    // await job.execute();

    await tryCatch(
      vmClient.submitJobResult({
        id: data.id,
        type: "result",
        status: "accepted",
        memoryKb: 256,
        runtimeMs: 256,
        stderr: "",
        stdout: "hello from VM!",
      }),
    );
  }
};

void main();
