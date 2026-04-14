import { pack, unpack } from "msgpackr";
import z from "zod";

export const zLang = z.enum(["cpp", "python"]);

export const zJob = z.object({
  lang: zLang,
  file: z.file(),
  id: z.uuid(),
});

export const serializeJob = async (input: z.infer<typeof zJob>) => {
  const { file, lang, id } = input;
  const fileBuf = await file.arrayBuffer();
  return pack({
    lang,
    id,
    file: fileBuf,
  });
};

export const deserializeJob = (
  input: Buffer | Uint8Array,
): z.infer<typeof zJob> => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { lang, id, file: fileBuf } = unpack(input);
  const file = new File([fileBuf as Buffer], "unnamed");
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  return zJob.parse({ lang, file, id });
};

export const zJobResult = z.object({
  id: z.uuid(),
  type: z.literal("result"),
  status: z.enum([
    "accepted",
    "wrong-answer",
    "compiler-error",
    "runtime-error",
    "time-limit-exceeded",
    "memory-limit-exceeded",
    "internal-error",
  ]),
  runtimeMs: z.number(),
  memoryKb: z.number(),
  stdout: z.string(),
  stderr: z.string(),
});

export const serializeJobResult = (input: z.infer<typeof zJobResult>) => {
  return pack(input);
};

export const deserializeJobResult = (input: Buffer | Uint8Array) => {
  return zJobResult.parse(unpack(input));
};

export const zJobStatus = z.object({
  id: z.uuid(),
  type: z.literal("status"),
  status: z.enum(["pending", "timed-out", "completed"]),
});

export const serializeJobStatus = (input: z.infer<typeof zJobStatus>) => {
  return pack(input);
};

export const deserializeJobStatus = (input: Buffer | Uint8Array) => {
  return zJobStatus.parse(unpack(input));
};

export const zJobStatusOrResult = z.discriminatedUnion("type", [
  zJobResult,
  zJobStatus,
]);
