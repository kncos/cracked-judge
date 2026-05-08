import z from "zod";
import { guestLogger } from "./utils";

const zEnv = z.object({
  JUDGE_SERVER_URL: z.string(),
});

const parsed = zEnv.safeParse(Bun.env);

if (!parsed.success) {
  guestLogger.error(
    `Invalid environemnt variables: ${z.prettifyError(parsed.error)}`,
  );
  process.exit(1);
}

export const env = parsed.data;
