import { pack, unpack } from "msgpackr";
import type z from "zod";
import { zJob } from "./schemas";

export const serializeJob = async (input: z.infer<typeof zJob>) => {
  const tarball = await input.tarball?.bytes();
  return pack({
    ...input,
    tarball,
  });
};

export const deserializeJob = (input: Buffer | Uint8Array) => {
  const unpacked = unpack(input) as {
    tarball?: Uint8Array;
  };
  const tarball = unpacked.tarball
    ? new File([unpacked.tarball], "files.tar")
    : undefined;
  return zJob.parse({
    ...unpacked,
    tarball,
  });
};
