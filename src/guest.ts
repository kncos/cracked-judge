import { $ } from "bun";
import { tryCatch } from "./lib/utils";

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
    const { jobType } = data;
    const result = await $`echo "${jobType}"`;
    const { data: submitData, error: submitErr } = await tryCatch(
      client.submitJob({
        exitCode: 230, // just to test for now?
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
      console.log("Shutting down...");
      process.exit(0);
    } else {
      console.log("Continuing...");
    }

    await Bun.sleep(1000);
    console.log("Finishing iteration...");
  }
};

await main();
