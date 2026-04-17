import type z from "../../node_modules/zod/v4/classic/external.d.cts";
import { zIsolateMeta, zIsolateRunOpts } from "./contract/types";

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
export const zStatus = z.enum(STATUS_CODES);
export const zJob = z.object({
  files: z.file(),
  isolateOpts: zIsolateRunOpts,
  returnPayload: z.boolean().optional().default(false),
});
export const zJobResult = z.object({
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
