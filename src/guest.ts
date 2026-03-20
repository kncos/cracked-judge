import { $ } from "bun";
import { tryCatch } from "./lib/utils";
import { vmClient } from "./server/client";

const main = async () => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    await Bun.sleep(1000);
    console.log("waiting for job...");
    const { data, error } = await tryCatch(vmClient.requestJob());
    if (error) {
      console.error("Error:", error);
      await Bun.sleep(1000);
      continue;
    }

    if (data) {
      const fileBuf = data.file;
      // we established this:
      // [14:00:00.123] TRACE (1015605): [vm0] (pid 1015644) Submitting job result... string
      console.log("Submitting job result...", txt);
      const { action } = await vmClient.submitJobResult({
        status: "wrong-answer",
        runtimeMs: 100,
        memoryKb: 100,
        stdout: txt,
        stderr: "",
        type: "result",
        id: data.id,
      });

      if (action === "continue") {
        console.log("Continuing...");
      } else {
        await $`reboot -f`;
      }
    } else {
      continue;
    }
  }
};

await main();
