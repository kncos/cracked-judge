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
  },
  admin: {
    submit: oc.input(zJob).output(zJobResult),
  },
  worker: {
    request: oc.output(zJob.nullable()),
    submit: oc.input(zJobResult),
  },
};
