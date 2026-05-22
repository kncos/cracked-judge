import { oc } from "@orpc/contract";
import z from "zod";
import { zJob, zJobResult, zJudgeResult } from "../db/types";

const zCheckRes = z.object({ ok: z.boolean() });

export const apiRouterContract = {
  judge: {
    submit: oc
      .input(
        z.object({
          problemId: z.string(),
          language: z.string(),
          tarball: z.file(),
        }),
      )
      .output(zJudgeResult.nullable()),
    get: oc.input(z.string()).output(zJudgeResult.nullable()),
    test: oc.output(zCheckRes),
  },
  job: {
    submit: oc.input(zJob.omit({ id: true })).output(zJobResult.nullable()),
    get: oc.input(z.string()).output(zJobResult.nullable()),
    test: oc.output(zCheckRes),
  },
  worker: {
    requestJob: oc.output(zJob.nullable()),
    submitJobResult: oc.input(zJobResult),
    test: oc.output(zCheckRes),
  },
};
