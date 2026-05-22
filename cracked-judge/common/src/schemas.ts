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

import z from "zod";

export const zIsolateRunOpts = z.object({
  // only required param
  // cmd: z.array(z.string().nonempty()).nonempty(),
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
  box_id: z.int(),
});
