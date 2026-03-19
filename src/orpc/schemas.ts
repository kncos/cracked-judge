import z from "zod";

export const zLang = z.enum(["cpp", "python"]);

export const zJob = z
  .object({
    lang: zLang,
    file: z.file(),
  })
  .transform(async (input) => {
    const fileData = await input.file.arrayBuffer();
    return {
      ...input,
      file: Buffer.from(fileData),
      id: crypto.randomUUID(),
    } satisfies z.infer<typeof zJobResolved>;
  });

export const zJobResolved = z.object({
  file: z.instanceof(Buffer),
  lang: zLang,
  id: z.uuid(),
});

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

export const zJobStatus = z.object({
  id: z.uuid(),
  type: z.literal("status"),
  status: z.enum(["pending", "timed-out", "completed"]),
});

export const zJobStatusOrResult = z.discriminatedUnion("type", [
  zJobResult,
  zJobStatus,
]);
