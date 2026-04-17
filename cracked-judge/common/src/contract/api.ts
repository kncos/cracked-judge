import { oc } from "@orpc/contract";
import z from "zod";
import { zJob, zJobResult, zJudgeStatus } from "./types";

export const apiRouterContract = {
  user: {
    submit: oc
      .input(
        z.object({
          files: z.file(),
        }),
      )
      .output(
        z.object({
          message: z.string(),
          status: zJudgeStatus,
          stdout: z.string(),
          stderr: z.string(),
        }),
      ),
    check: oc.output(
      z.object({
        ok: z.boolean(),
        message: z.string(),
      }),
    ),
  },
  admin: {
    submit: oc.input(zJob).output(zJobResult),
  },
  worker: {
    request: oc
      .input(
        z
          .object({ timeoutSec: z.number().min(0).optional().default(30) })
          .optional()
          .default({ timeoutSec: 30 }),
      )
      .output(zJob.nullable()),
    submit: oc.input(zJobResult),
    check: oc.output(
      z.object({
        ok: z.boolean(),
        message: z.string(),
      }),
    ),
  },
};
