import { pack, unpack } from "msgpackr";
import type z from "zod";
import { zJob } from "../db/types";

export const serializeJob = (input: z.infer<typeof zJob>) => {
  return pack(input);
};

export const deserializeJob = (input: Buffer | Uint8Array) => {
  return zJob.parse(unpack(input));
};
