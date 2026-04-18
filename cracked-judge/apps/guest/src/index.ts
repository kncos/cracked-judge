import { WorkerClient } from "@cracked-judge/common/contract";
import { fileExists } from "@cracked-judge/common/file-system";
import { procLogHelper } from "@cracked-judge/common/proc";
import path from "path";
import { isolate } from "./isolate/commands";
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

    // step 1: unpack payload
    const boxPath = isolate.init();
    const filesPath = path.join(boxPath, "box", "files.zip");
    const totalBytes = await Bun.write(filesPath, job.files);
    guestLogger.debug(`Wrote ${totalBytes / 1024} KiB to ${filesPath}`);
    // unzip flat
    const cmd = ["unzip", "-o", filesPath, "-d", path.dirname(filesPath)];
    const proc = Bun.spawnSync(cmd);
    procLogHelper(
      proc,
      cmd,
      guestLogger.child({}, { msgPrefix: "unzip proc: " }),
    );
    if (proc.exitCode !== 0) {
      guestLogger.debug(
        "unzip returned non-zero, cleaning up and continuing...",
      );
      isolate.cleanup();
      continue;
    }

    const compileScriptPath = path.join(boxPath, "box", "compile.sh");
    const runScriptPath = path.join(boxPath, "box", "run.sh");

    // step 2: compile.sh and run.sh
    const compilerResult = fileExists(compileScriptPath)
      ? isolate.run({ cmd: ["/bin/sh", "compile.sh"], processes: true })
      : undefined;
    // compiler results use CE in place of RE/TLE/MLE/... for top level
    if (compilerResult && compilerResult.status !== "AC") {
      compilerResult.status = compilerResult.status === "IE" ? "IE" : "CE";
      guestLogger.debug(compilerResult, "Compilation failed. Submitting...");
      await client.submit({
        id: job.id,
        compilerResult,
        message: compilerResult.message,
        status: compilerResult.status,
      });
      // do not run if compilation failed
      continue;
    }

    // compilation was either skipped or succeeded, exec run.sh if it exists
    const runtimeResult = fileExists(runScriptPath)
      ? isolate.run({ ...job, cmd: ["/bin/sh", "run.sh"] })
      : undefined;

    // payload will be a zip with all of the files in the sandbox to be
    // delivered back to the server
    const payload = (() => {
      if (!job.returnPayload) {
        return undefined;
      }
      const payloadCmd = ["zip", "payload.zip", "-r", "*", "-x", '"*.zip"'];
      const proc = Bun.spawnSync(payloadCmd, {
        cwd: path.join(boxPath, "box"),
      });
      procLogHelper(
        proc,
        payloadCmd,
        guestLogger.child({}, { msgPrefix: "zip proc: " }),
      );
      return Bun.file(path.join(boxPath, "box", "payload.zip"));
    })();

    await client.submit({
      id: job.id,
      message:
        runtimeResult?.message ??
        compilerResult?.message ??
        "Neither compile.sh or run.sh provided",
      status: runtimeResult?.status ?? compilerResult?.status ?? "IE",
      compilerResult,
      runtimeResult,
      payload: payload ? new File([payload], "payload.zip") : payload,
    });
  }
};

void main();
