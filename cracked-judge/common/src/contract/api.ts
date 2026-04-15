import { oc } from "@orpc/contract";
import z from "zod";
import { zIsolateMeta, zIsolateRunOpts } from "./isolate";

export const STATUS_CODES = [
  "AC",
  "WA",
  "TLE",
  "MLE",
  "OLE",
  "RE",
  "CE",
  "IE",
] as const;
export type StatusCode = (typeof STATUS_CODES)[number];

const zStatus = z.enum(STATUS_CODES);

const zJob = z.object({
  files: z.file(),
  isolateOpts: zIsolateRunOpts,
  returnPayload: z.boolean().optional().default(false),
});

const zJobResult = z.object({
  compilerResult: z
    .object({
      meta: zIsolateMeta,
      stdout: z.string(),
      stderr: z.string(),
    })
    .optional(),
  runtimeResult: z
    .object({
      meta: zIsolateMeta,
      stdout: z.string(),
      stderr: z.string(),
    })
    .optional(),
  message: z.string(),
  status: zStatus,
  payload: z.file().optional(),
});

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
          status: zStatus,
          stdout: z.string(),
          stderr: z.string(),
        }),
      ),
  },
  admin: {
    submit: oc.input(zJob).output(zJobResult),
  },
  worker: {
    request: oc.output(zJob),
    submit: oc.input(zJobResult),
  },
};
