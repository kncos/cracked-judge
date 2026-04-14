import z from "zod";

const zEnv = z.object({
  NODE_ENV: z
    .optional(z.enum(["development", "production"]))
    .default("development"),
});

console.log("node env: ", process.env.NODE_ENV);
export const env = zEnv.parse({
  ...process.env,
});
