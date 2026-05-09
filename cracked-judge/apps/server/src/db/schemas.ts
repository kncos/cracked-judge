import { relations } from "drizzle-orm";
import { pgSchema, text, timestamp } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

export const schema = pgSchema("crackedjudge");

const tableBase = {
  id: text()
    .primaryKey()
    .$defaultFn(() => nanoid(8)),
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp(),
} as const;

export const jobStepResults = schema.table("job_step_results", {
  ...tableBase,
  job_result_id: text(),
});

export const jobResults = schema.table("job_results", {
  ...tableBase,
});

export const jobStepReultsRelations = relations(jobStepResults, ({ one }) => ({
  job_result: one(jobResults, {
    fields: [jobStepResults.job_result_id],
    references: [jobResults.id],
  }),
}));

export const jobResultsRelations = relations(jobResults, ({ many }) => ({
  job_step_results: many(jobStepResults),
}));
