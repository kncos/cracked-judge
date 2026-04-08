import path from "path";
import z from "zod";

export const zConfig = z.object({
  depsRoot: z.string().transform((str) => path.resolve(str)),
  jailerRoot: z.string().transform((str) => path.resolve(str)),
  hostRuntimeRoot: z.string().transform((str) => path.resolve(str)),

  // We can accept literal paths to jailer & firecracker, and if not provided
  // we just assume they are in the PATH and can be accessed directly
  jailerBinaryPath: z
    .string()
    .optional()
    .transform((str) => (str ? path.resolve(str) : "jailer")),

  firecrackerBinaryPath: z
    .string()
    .optional()
    .transform((str) => (str ? path.resolve(str) : "firecracker")),
});

export type HostConfig = z.infer<typeof zConfig>;
