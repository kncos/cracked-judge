import { $ } from "bun";
import { tryCatch } from "./lib/utils";
import { client } from "./orpc/client";

const main = async () => {
  const decoder = new TextDecoder();
  while (true) {
    console.log("waiting for job...");
    const { data, error } = await tryCatch(client.requestJob());
    if (error) {
      console.error("Error:", error);
      await Bun.sleep(1000);
      continue;
    }
    const { script } = data;
    const result = await $`${script}`.nothrow();
    const { data: submitData, error: submitErr } = await tryCatch(
      client.submitJob({
        exitCode: result.exitCode,
        stdout: decoder.decode(result.stdout),
        stderr: decoder.decode(result.stderr),
      }),
    );
    if (submitErr) {
      console.error("Submit error: ", submitErr);
      await Bun.sleep(1000);
      continue;
    }

    const { action } = submitData;
    if (action === "die") {
      await $`reboot -f`.nothrow();
      console.log("Shutting down...");
      process.exit(0);
    }

    await Bun.sleep(1000);
    console.log("Finishing iteration...");
  }
};

await main();
