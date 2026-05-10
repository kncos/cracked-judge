import { JOB_STATUS_CODES } from "@cracked-judge/common/contract";
import {
  boolean,
  jsonb,
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

export const judge_status = pgEnum("judge_status", JOB_STATUS_CODES);

export const jobResults = pgTable("job_results", {
  ...tableBase,
  success: boolean(),
  stepResults: jsonb(),
});
