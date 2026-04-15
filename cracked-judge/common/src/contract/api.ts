import { oc } from "@orpc/contract";
import z from "zod";
import { zIsolateMeta, zIsolateRunOpts } from "./isolate";

export const apiRouterContract = {
  judge: {
    submit: oc
      .input(
        z.object({
          submission: z.file(),
          language: z.enum(["cpp", "python"]),
        }),
      )
      .output(
        z.object({
          // display friendly
          message: z.string(),
          // stdout + stderr output of the last step that executed, truncated
          output: z.string(),
          status: z.enum(["AC", "WA", "TLE", "MLE", "OLE", "RE", "CE", "IE"]),
        }),
      ),
  },
  execute: {
    submit: oc
      .input(
        z.object({
          submission: z.file(),
          dependencyKey: z.string().max(256).optional(),
          isolateOptions: zIsolateRunOpts,
          includePayload: z.boolean().optional().default(true),
        }),
      )
      .output(
        z.object({
          message: z.string(),
          // zips the sandbox and returns it here if includePayload = true
          payload: z.file().optional(),
          isolateMeta: zIsolateMeta,
          stdout: z.string(),
          stderr: z.string(),
        }),
      ),
  },
};
