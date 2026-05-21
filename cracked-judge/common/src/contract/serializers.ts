import { pack, unpack } from "msgpackr";
import type z from "zod";
import { zJob } from "./schemas";

export const serializeJob = async (input: z.infer<typeof zJob>) => {
  const steps = await Promise.all(
    input.steps.map(async (step) => ({
      ...step,
      tarball: await step.tarball?.bytes(),
    })),
  );
  return pack({
    ...input,
    steps,
  });
};

export const deserializeJob = (input: Buffer | Uint8Array) => {
  const unpacked = unpack(input) as {
    steps: Array<{ tarball: Uint8Array }>;
  };
  const steps = unpacked.steps.map((step) => ({
    ...step,
    tarball: step.tarball ? new File([step.tarball], "tarball.tar") : undefined,
  }));
  return zJob.parse({
    ...unpacked,
    steps,
  });
};
