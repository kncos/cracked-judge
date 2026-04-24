import type {
  zJob,
  zJobResult,
  zJobStep,
  zJobStepResult,
} from "@cracked-judge/common/contract";
import { $ } from "bun";
import path from "node:path";
import type z from "zod";
import { isolate } from "./isolate/commands";
import { interpretMeta } from "./isolate/utils";

const handleStep = async (
  step: z.infer<typeof zJobStep>,
  boxPath: string,
  boxId: number,
): Promise<z.infer<typeof zJobStepResult>> => {
  if (step.files) {
    await $`tar -xf - -C ${boxPath} < ${step.files}`;
  }
  await Promise.all(
    step.dependencyUrls.map(async (url) => {
      await $`curl -sSL ${url} | tar -xf - -C ${boxPath}`;
    }),
  );

  const res = isolate.run(step.cmd, { ...step.isolateOpts, box_id: boxId });
  if (step.uploadUrl) {
    await $`tar -cf - ${boxPath} | curl -X PUT --upload-file - "${step.uploadUrl}"`;
  }
  return {
    ...res,
    // rethinking if false should ever be an option
    uploadUrl: step.uploadUrl,
    ...interpretMeta(res.meta),
  };
};

export const handleJob = async (
  job: z.infer<typeof zJob>,
): Promise<z.infer<typeof zJobResult>> => {
  const { id, steps } = job;
  const boxRoot = isolate.init(job.box_id);
  const boxPath = path.join(boxRoot, "box");

  const results = [];
  let success = true;
  for (const step of steps) {
    const res = await handleStep(step, boxPath, job.box_id);
    results.push(res);
    if (res.status !== "AC") {
      success = false;
    }
  }

  isolate.cleanup(job.box_id);

  return {
    stepResults: results,
    id,
    success,
  };
};
