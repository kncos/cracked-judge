import { WorkerClient } from "@cracked-judge/common/contract";
import path from "path";
import { isolate } from "./isolate/commands";
import { prepareJob, runBoxScript, zipSandbox } from "./job";
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

    const prepareRes = await prepareJob(job);
    if (!prepareRes.success) {
      guestLogger.debug(
        prepareRes,
        "Job prep failed, performing cleanup & skipping job...",
      );
      isolate.cleanup();
      continue;
    }
    const { boxPath } = prepareRes;
    const compileScript = path.join(boxPath, "box", "compile.sh");

    const compileRes = runBoxScript(compileScript);
    if (compileRes.status === "failed") {
      guestLogger.debug(
        compileRes,
        "Compilation failed, submitting job result and skipping remaining steps...",
      );
      const { res } = compileRes;
      await client.submit({
        id: job.id,
        compilerResult: res,
        message: `Compilation failed: ${res.message}`,
        status: res.status === "IE" ? "IE" : "CE",
      });
      continue;
    }

    const runScript = path.join(boxPath, "box", "run.sh");
    const runRes = runBoxScript(runScript);
    if (runRes.status === "skipped" && compileRes.status === "skipped") {
      const message = "No compile.sh or run.sh was provided. Job was a no-op.";
      guestLogger.debug(message);
      await client.submit({
        id: job.id,
        message,
        status: "AC",
      });
      continue;
    }

    const payloadResult = zipSandbox(boxPath, job.returnPayload);
    await client.submit({
      compilerResult: compileRes.res,
      runtimeResult: runRes.res,
      id: job.id,
      message: runRes.res?.message ?? compileRes.res?.message ?? "n/a",
      status: runRes.res?.status ?? compileRes.res?.status ?? "IE",
      payload: payloadResult.payload,
    });
  }
};

void main();
