import { $ } from "bun";
import { tryCatch } from "./lib/utils";
import { vmClient } from "./server/client";

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

// map job langs to paths on the host
const paths: Record<string, string> = {
  cpp: "/app/drivers/cpp",
  python: "/app/drivers/python",
  bash: 
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

    if (data) {
      const checkpoint1 = Date.now();
      const compile = handleShellRes(
        await $`/app/drivers/cpp26/compile.sh`.nothrow(),
      );

      const checkpoint2 = Date.now();
      console.log(`Compile time: ${checkpoint2 - checkpoint1}ms`);
      const run = handleShellRes(await $`/app/drivers/cpp26/run.sh`.nothrow());
      const checkpoint3 = Date.now();
      console.log(`Run time: ${checkpoint3 - checkpoint2}ms`);
      console.log(`Total time: ${checkpoint3 - checkpoint1}ms`);

      const { action } = await vmClient.submitJobResult({
        id: data.id,
        memoryKb: 100,
        runtimeMs: 100,
        status: "accepted",
        stdout: compile,
        stderr: run,
        type: "result",
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
