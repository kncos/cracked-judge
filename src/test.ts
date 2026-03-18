import z from "zod";

export const zJob = z
  .object({
    lang: z.enum(["cpp", "python"]),
    file: z.file(),
  })
  .transform(async (input) => {
    const fileData = await input.file.arrayBuffer();
    await Bun.sleep(250);
    return {
      ...input,
      file: Buffer.from(fileData),
    };
  });

const file = new File(["hello, world"], "test");
const result = await zJob.parseAsync({ lang: "cpp", file });
