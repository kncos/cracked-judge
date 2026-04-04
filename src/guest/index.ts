import { $ } from "bun";
import { tryCatch } from "../lib/utils";
import { vmClient } from "../server/client";
import { createJob } from "./job";

const handleShellRes = (res: $.ShellOutput) => {
  const d = new TextDecoder();
  const err = d.decode(res.stderr);
  const out = d.decode(res.stdout);
  return [
    `====> STDERR <====`,
    err,
    `====> STDOUT <====`,
    out,
    `====> END <====`,
    `EXIT CODE: ${res.exitCode}`,
  ].join("\n");
};

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

    await using job = await createJob(data);
    await job.execute();
  }
};

await main();
