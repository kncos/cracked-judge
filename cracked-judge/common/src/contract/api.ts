import { oc } from "@orpc/contract";
import z from "zod";
import { zJob, zJobResult } from "./schemas";

const zCheckRes = z.object({ ok: z.boolean() });

export const apiRouterContract = {
  user: {
    submit: oc.input(zJob).output(z.object(zJobResult)),
    check: oc.output(zCheckRes),
  },
  admin: {
    submit: oc.input(zJob).output(zJobResult),
    check: oc.output(zCheckRes),
  },
  worker: {
    request: oc
      .input(z.object({ timeout: z.number().nonnegative() }).optional())
      .output(zJob.nullable()),
    submit: oc.input(zJobResult),
    check: oc.output(zCheckRes),
  },
};
