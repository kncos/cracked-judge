import { os } from '@orpc/server';
import type { IncomingHttpHeaders } from 'node:http';
import * as z from 'zod';

const zSchema = z.object({
  a: z.number(),
  b: z.number(),
});

export const add = os
  .$context<{ headers: IncomingHttpHeaders }>()
  .input(zSchema)
  .handler(async ({ input, context }) => {
    return { sum: input.a + input.b };
  });

export const router = {
  math: {
    add,
  },
};
