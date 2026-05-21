import z from "zod";

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
  box_id: z.int(),
});

export const GENERIC_JOB_STATUSES = [
  "success",
  "non_zero_exit",
  "time_limit_exceeded",
  "memory_limit_exceeded",
  "output_limit_exceeded",
  "internal_error",
] as const;
export type GenericJobStatus = (typeof GENERIC_JOB_STATUSES)[number];

export const JOB_TYPES = ["generic", "judge"] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const zJobStepResult = z.object({
  memory: z.number(),
  time: z.number(),
  time_wall: z.number(),
  status: z.enum(GENERIC_JOB_STATUSES),
  exit_code: z.int(),
  exit_signal: z.int(),
  forced_context_switches: z.number(),
  voluntary_context_switches: z.number(),
  stdout: z.string(),
  stderr: z.string(),
});

export const zJobResult = z.object({
  id: z.string(),
  steps: z.array(zJobStepResult),
  success: z.boolean(),
  type: z.enum(["generic", "judge"]),
});

export const JUDGE_JOB_STATUSES = [
  "success",
  "wrong_answer",
  "runtime_error",
  "compiler_error",
  "time_limit_exceeded",
  "memory_limit_exceeded",
  "output_limit_exceeded",
  "internal_error",
] as const;
export type JudgeJobStatus = (typeof JUDGE_JOB_STATUSES)[number];

export const zJudgeResult = z.object({
  id: z.string(),
  status: z.enum(JUDGE_JOB_STATUSES),
  compile: zJobStepResult.omit({ status: true }).partial().optional(),
  run: zJobStepResult.omit({ status: true }).partial().optional(),
});

export const zJobStep = z.object({
  cmd: z.array(z.string()),
  tarball: z.file().optional(),
  isolateOpts: zIsolateRunOpts.omit({ box_id: true }).optional(),
  dependencyUrls: z.array(z.url()).optional(),
  uploadUrl: z.url().optional(),
});

export const zJob = z.object({
  id: z.string(),
  type: z.enum(["generic", "judge"]),
  steps: z.array(zJobStep),
});
