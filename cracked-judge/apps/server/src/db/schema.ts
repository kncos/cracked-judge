import { JUDGE_STATUS_CODES } from "@cracked-judge/common/contract";
import { relations } from "drizzle-orm";
import {
  boolean,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

// export const schema = pgSchema("crackedjudge");

const tableBase = {
  id: text()
    .primaryKey()
    .$defaultFn(() => nanoid(8)),
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp(),
} as const;

export const judge_status = pgEnum("judge_status", JUDGE_STATUS_CODES);

export const jobStepResults = pgTable("job_step_results", {
  ...tableBase,
  job_result_id: text().references(() => jobResults.id),
  meta: json(),
  stdout: text(),
  stderr: text(),
  uploadUrl: text(),
  status: judge_status(),
  message: text(),
});

export const jobResults = pgTable("job_results", {
  ...tableBase,
  success: boolean(),
});

export const jobStepResultsRelations = relations(jobStepResults, ({ one }) => ({
  job_result: one(jobResults, {
    fields: [jobStepResults.job_result_id],
    references: [jobResults.id],
  }),
}));

export const jobResultsRelations = relations(jobResults, ({ many }) => ({
  job_step_results: many(jobStepResults),
}));
