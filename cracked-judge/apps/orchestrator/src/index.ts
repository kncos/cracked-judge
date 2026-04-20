import ADS from "disposablestack/AsyncDisposableStack/implementation";
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
globalThis.AsyncDisposableStack = ADS;

import { manualWhich } from "@cracked-judge/common/file-system";
import { readFileSync } from "fs";
import z, { ZodError } from "zod";
import { zHostConfig } from "./config";
import { HostFilesystem } from "./fs-prep";
import { vmLogger } from "./logger";
import { createVmPool } from "./orchestrator";

const main = async () => {
  const configPath = manualWhich("config.json", [
    ".",
    "/var/lib/cracked-judge",
  ]);

  const [config, isDefault] = (() => {
    // const defaultConf = zHostConfig.parse({});

    if (configPath !== null) {
      vmLogger.info(`Found config file at path: ${configPath}`);
    } else {
      vmLogger.info(`Did not find config file`);
      throw new Error("exit");
      // return [defaultConf, true] as const;
    }

    try {
      console.error("got here");
      const file = readFileSync(configPath).toString("utf-8");
      console.error("got here");
      console.log(file);
      console.error("got here");

      const config = zHostConfig.parse(JSON.parse(file));
      return [config, false] as const;
    } catch (e) {
      const msg =
        e instanceof ZodError ? z.prettifyError(e) : (e as Error).message;
      vmLogger.error(`Failed to parse json config:\n${msg}`);
      throw e;
    }
  })();

  if (isDefault) {
    vmLogger.info(config, "Used DEFAULT config:");
  } else {
    vmLogger.info(config, "Used config:");
  }

  // cleaned up after the controller aborts
  const fs = new HostFilesystem(config);
  const pool = await createVmPool(config);

  const controller = new AbortController();
  process.on("SIGINT", () => {
    controller.abort();
  });
  process.on("SIGTERM", () => {
    controller.abort();
  });

  const signal = controller.signal;
  await new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
    }
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });

  await pool.drain();
  await pool.clear();
  fs.destroy();
};

void main();
