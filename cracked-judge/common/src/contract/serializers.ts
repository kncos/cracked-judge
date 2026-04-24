import { pack, unpack } from "msgpackr";
import type z from "zod";
import { zJob } from "./schemas";

export const serializeJob = async (input: z.infer<typeof zJob>) => {
  const steps = await Promise.all(
    input.steps.map(async (step) => ({
      ...step,
      files: await step.files?.bytes(),
    })),
  );
  return pack({
    id: input.id,
    steps,
  });
};

export const deserializeJob = (input: Buffer | Uint8Array) => {
  const unpacked = unpack(input) as {
    id: string;
    steps: Array<{ files: Uint8Array }>;
  };
  const steps = unpacked.steps.map((step) => ({
    ...step,
    files: step.files ? new File([step.files], "files.tar") : undefined,
  }));
  return zJob.parse({
    id: unpacked.id,
    steps,
  });
};
