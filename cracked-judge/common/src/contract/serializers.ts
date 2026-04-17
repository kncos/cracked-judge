import { pack, unpack } from "msgpackr";
import type z from "zod";
import { zJob, zJobResult } from "./types";

export const serializeJob = async (input: z.infer<typeof zJob>) => {
  const { files, ...rest } = input;
  const fileBuf = await files.arrayBuffer();
  return pack({
    ...rest,
    files: fileBuf,
  });
};

export const deserializeJob = (input: Buffer | Uint8Array) => {
  const { files: buf, ...rest } = unpack(input) as z.infer<typeof zJob> & {
    files: Buffer;
  };
  const parsed = zJob.parse({
    ...rest,
    files: new File([buf as Buffer], "files"),
  });
  return parsed;
};

export const serializeJobResult = async (input: z.infer<typeof zJobResult>) => {
  const { payload, ...rest } = input;
  if (!payload) {
    return pack(rest);
  }
  const buf = await payload.arrayBuffer();
  return pack({
    ...rest,
    payload: buf,
  });
};

export const deserializeJobResult = (input: Buffer | Uint8Array) => {
  const { payload: buf, ...rest } = unpack(input) as z.infer<
    typeof zJobResult
  > & {
    payload: Buffer | undefined;
  };

  if (!buf) {
    return zJobResult.parse(rest);
  }
  const parsed = zJobResult.parse({
    ...rest,
    payload: new File([buf as Buffer], "payload"),
  });
  return parsed;
};
