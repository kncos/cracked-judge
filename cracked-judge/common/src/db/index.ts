import { defineRelations } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema";

export const relations = defineRelations(schema);

export const db = drizzle(
  process.env.DATABASE_URL ??
    "postgresql://admin:password@localhost:5432/crackedjudge",
  {
    relations,
  },
);

export * as schemas from "./schema";
export * from "./types";
