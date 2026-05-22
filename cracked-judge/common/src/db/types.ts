import { createSelectSchema } from "drizzle-orm/zod";
import z from "zod";
import { zIsolateRunOpts } from "../schemas";
import { jobResults, jobs, judgeResults } from "./schema";

export const GENERIC_JOB_STATUSES = [
  "success",
  "non_zero_exit",
  "time_limit_exceeded",
  "memory_limit_exceeded",
  "output_limit_exceeded",
  "internal_error",
] as const;
export type GenericJobStatus = (typeof GENERIC_JOB_STATUSES)[number];

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

export const JOB_TYPES = ["generic", "judge"] as const;
export type JobType = (typeof JOB_TYPES)[number];

const zJobStepResult = z.object({
  memory: z.number(),
  time: z.number(),
  time_wall: z.number(),
  status: z.enum(GENERIC_JOB_STATUSES),
  exit_code: z.int(),
  exit_signal: z.int(),
  csw_forced: z.int(),
  csw_voluntary: z.int(),
  stdout: z.string(),
  stderr: z.string(),
});
export type JobStepResult = z.infer<typeof zJobStepResult>;

export const zJobResult = createSelectSchema(jobResults, {
  steps: z.array(zJobStepResult),
});

export const zJudgeResult = createSelectSchema(judgeResults);
const zJobStep = z.object({
  cmd: z.array(z.string()),
  isolateOpts: zIsolateRunOpts.omit({ box_id: true }).optional(),
  uploadUrl: z.url().optional(),
});
export type JobStep = z.infer<typeof zJobStep>;

export const zJob = createSelectSchema(jobs, {
  steps: z.array(zJobStep),
});
