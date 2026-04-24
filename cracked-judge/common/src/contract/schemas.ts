import z from "zod";
import { JUDGE_STATUS_CODES } from "./types";

/**
 * Options for isolate.
 * - `time`, `wall_time`, and `extra_time` are in sections and accept decimals
 * - `cg_mem`, `stack`, and `fsize` are in KiB
 * - `box_id` defaults to `0`
 * - `processes`:
 *    - key absent: no sub-processes allowed
 *    - value is int: {value} sub-processes allowed
 *    - value is `true`: unlimited sub-processes allowed
 * @see https://www.ucw.cz/isolate/isolate.1.html
 */
export const zIsolateRunOpts = z.object({
  // only required param
  // cmd: z.array(z.string().nonempty()).nonempty(),
  time: z.number().nonnegative().optional(),
  cg_mem: z.int().nonnegative().optional(),
  wall_time: z.number().nonnegative().optional(),
  extra_time: z.number().nonnegative().optional(),
  stack: z.int().nonnegative().optional(),
  open_files: z.int().nonnegative().optional(),
  fsize: z.int().nonnegative().optional(),
  quota: z
    .object({
      blocks: z.int().nonnegative(),
      inodes: z.int().nonnegative(),
    })
    .optional(),
  processes: z.int().or(z.literal(true)).optional(),
  box_id: z.int().optional().default(0),
});

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
  status: z.enum(["RE", "SG", "TO", "XX"]).optional(),
  time: z.coerce.number(),
  time_wall: z.coerce.number(),
});

export const zJobStep = z.object({
  cmd: z.array(z.string()),
  isolateOpts: zIsolateRunOpts,
  dependencyUrls: z.array(z.url()),
  files: z.file().optional(),
  uploadUrl: z.url().optional(),
});

export const zJob = z.object({
  id: z.string(),
  steps: z.array(zJobStep).nonempty(),
});

export const zJobStepResult = z.object({
  meta: zIsolateMeta,
  stdout: z.string(),
  stderr: z.string(),
  upload: z
    .object({
      success: z.boolean(),
      url: z.url(),
    })
    .optional(),
});

export const zJobResult = z.object({
  id: z.string(),
  // stops after the first failed step
  stepResults: z.array(zJobStepResult),
  success: z.boolean(),
});
export const zJudgeStatus = z.enum(JUDGE_STATUS_CODES);
