import * as Bun from "bun";
import z from "zod";
import type { JudgeStatus } from "../utils";

export type IsolateResult = {
  stdout: string;
  stderr: string;
  metadata: z.infer<typeof zIsolateMeta>;
  status: JudgeStatus;
  message: string;
  payload?: Bun.BunFile;
};

export const zIsolateLimits = z
  .object({
    time: z.number().nonnegative(),
    memory: z.number().nonnegative(),
    wall_time: z.number().nonnegative(),
    extra_time: z.number().nonnegative(),
    stack_size: z.number().nonnegative(),
    open_files: z.number().nonnegative(),
    file_size: z.number().nonnegative(),
    quota: z.object({
      blocks: z.number().nonnegative(),
      inodes: z.number().nonnegative(),
    }),
    //TODO: add `true` to this type union and in that case just
    //TODO: pass `-p` for unlimited sub-processes
    processes: z.number(),
  })
  .partial();

export const zIsolateMeta = z.object({
  cg_mem: z.coerce.number(),
  // the key is present with value `1` if its true. Normalized to true/false here
  cg_oom_killed: z.coerce
    .number()
    .optional()
    .default(0)
    .transform((v) => v === 1),
  csw_forced: z.coerce.number(),
  csw_voluntary: z.coerce.number(),
  exitcode: z.coerce.number().optional(),
  exitsig: z.coerce.number().optional(),
  // normalized to true/false
  killed: z.coerce
    .number()
    .optional()
    .default(0)
    .transform((v) => v === 1),
  max_rss: z.coerce.number(),
  message: z.string().optional().default("N/A"),
  status: z.enum(["RE", "SG", "TO", "XX"]),
  time: z.coerce.number(),
  time_wall: z.coerce.number(),
});
