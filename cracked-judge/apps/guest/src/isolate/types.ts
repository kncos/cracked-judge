import z from "zod";

export type IsolateCompileResult = {
  stdout: string;
  stderr: string;
  metadata: z.infer<typeof zIsolateMeta>;
  status: "CE" | "IE" | "AC";
};

// quick check to generate an error if these ever become decoupled
type _t = IsolateCompileResult["status"] extends JudgeStatus ? true : false;
const _check_t: _t = true;

export type IsolateResult = {
  stdout: string;
  stderr: string;
  meta: z.infer<typeof zIsolateMeta>;
  status: JudgeStatus;
  message: string;
};

/**
 * Options for isolate.
 * - `time`, `wall_time`, and `extra_time` are in sections and accept decimals
 * - `cg_mem`, `stack`, and `fsize` are in KiB
 * - `box_id` defaults to `0`
 * - `processes`:
 *    - key absent: no sub-processes allowed
 *    - value is int: {value} sub-processes allowed
 *    - value is `true`: unlimited sub-processes allowed
 * @see https://www.ucw.cz/isolate/isolate.1.html
 */
export const zIsolateRunOpts = z.object({
  // only required param
  cmd: z.array(z.string().nonempty()).nonempty(),
  time: z.number().nonnegative().optional(),
  cg_mem: z.int().nonnegative().optional(),
  wall_time: z.number().nonnegative().optional(),
  extra_time: z.number().nonnegative().optional(),
  stack: z.int().nonnegative().optional(),
  open_files: z.int().nonnegative().optional(),
  fsize: z.int().nonnegative().optional(),
  quota: z
    .object({
      blocks: z.int().nonnegative(),
      inodes: z.int().nonnegative(),
    })
    .optional(),
  processes: z.int().or(z.literal(true)).optional(),
  box_id: z.int().default(0).optional(),
});

export const zIsolateMeta = z.object({
  cg_mem: z.coerce.number(),
  // the key is present with value `1` if its true. Normalized to true/false here
  cg_oom_killed: z.coerce
    .number()
    .optional()
    .default(0)
    .transform((v) => v === 1),
  csw_forced: z.coerce.number(),
  csw_voluntary: z.coerce.number(),
  exitcode: z.coerce.number().optional(),
  exitsig: z.coerce.number().optional(),
  // normalized to true/false
  killed: z.coerce
    .number()
    .optional()
    .default(0)
    .transform((v) => v === 1),
  max_rss: z.coerce.number(),
  message: z.string().optional().default("N/A"),
  status: z.enum(["RE", "SG", "TO", "XX"]).optional(),
  time: z.coerce.number(),
  time_wall: z.coerce.number(),
});

export type JudgeStatus =
  | "IE"
  | "CE"
  | "RE"
  | "MLE"
  | "TLE"
  | "WA"
  | "AC"
  | "OLE";
