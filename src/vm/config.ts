import { dirInfo, fileExists } from "@/lib/file-system/utils";
import { CrackedError } from "@/lib/judge-error";
import path from "path";
import z from "zod";

export const zHostConfig = z.object({
  depsSource: z.string().transform((str) => path.resolve(str)),
  runtimeRoot: z
    .string()
    .optional()
    .transform((str) => (str ? path.resolve(str) : "/run/cracked-judge")),

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

export type HostConfig = z.infer<typeof zHostConfig>;

/**
 * Synchronously validates the associated filesystem specified in the HostConfig:
 * - checks that depsSource is a non-empty directory
 * - checks that runtimeRoot is either empty or non-existant
 * - checks that firecracker & jailer binaries exist
 * @param input A HostConfig instance
 */
export const validateHostConfig = (input: HostConfig) => {
  const { depsSource, runtimeRoot, jailerBinaryPath, firecrackerBinaryPath } =
    input;

  const depsSourceInfo = dirInfo(depsSource);
  if (depsSourceInfo !== "nonempty") {
    throw new CrackedError("CONFIG_ERROR", {
      message:
        "Dependencies source directory is invalid:\n" +
        `  Directory: ${depsSource}\n` +
        `  Expected \`nonempty\` directory. Found: ${depsSourceInfo}.`,
    });
  }

  const runtimeRootInfo = dirInfo(runtimeRoot);
  if (runtimeRoot === "nonempty") {
    throw new CrackedError("CONFIG_ERROR", {
      message:
        "Runtime directory is invalid:\n" +
        `  Directory: ${runtimeRoot}\n` +
        `  Expected \`empty\` or \`nonexistant\` directory. Found: ${runtimeRootInfo}.`,
    });
  }

  if (!fileExists(jailerBinaryPath)) {
    throw new CrackedError("CONFIG_ERROR", {
      message:
        "Jailer binary is invalid:\n" +
        `  No jailer binary found at path: ${jailerBinaryPath}`,
    });
  }

  if (!fileExists(firecrackerBinaryPath)) {
    throw new CrackedError("CONFIG_ERROR", {
      message:
        "firecracker binary is invalid:\n" +
        `  No firecracker binary found at path: ${firecrackerBinaryPath}`,
    });
  }
};
