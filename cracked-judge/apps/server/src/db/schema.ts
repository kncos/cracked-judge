import {
  GENERIC_JOB_STATUSES,
  JOB_TYPES,
  JUDGE_JOB_STATUSES,
  zJobStepResult,
} from "@cracked-judge/common/contract";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { nanoid } from "nanoid";
import type z from "zod";

const tableBase = {
  id: text()
    .primaryKey()
    .$defaultFn(() => nanoid(8)),
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp(),
} as const;

export const genericJobStatus = pgEnum(
  "generic_job_status",
  GENERIC_JOB_STATUSES,
);
export const judgeJobStatus = pgEnum("judge_job_status", JUDGE_JOB_STATUSES);
export const jobType = pgEnum("job_type", JOB_TYPES);

type StepsType = Array<z.infer<typeof zJobStepResult>>;
export const jobResults = pgTable("job_results", {
  ...tableBase,
  success: boolean(),
  steps: jsonb().$type<StepsType>(),
  type: jobType(),
});

export const judgeResults = pgTable("judge_results", {
  id: text().primaryKey(),
  status: judgeJobStatus(),

  // compile stats
  compile_memory: numeric(),
  compile_time: numeric(),
  compile_time_wall: numeric(),
  compile_exit_code: integer(),
  compile_exit_signal: integer(),
  compile_csw_forced: integer(),
  compile_csw_voluntary: integer(),
  compile_stdout: text(),
  compile_stderr: text(),
  // run stats
  run_memory: numeric(),
  run_time: numeric(),
  run_time_wall: numeric(),
  run_exit_code: integer(),
  run_exit_signal: integer(),
  run_csw_forced: integer(),
  run_csw_voluntary: integer(),
  run_stdout: text(),
  run_stderr: text(),
});
