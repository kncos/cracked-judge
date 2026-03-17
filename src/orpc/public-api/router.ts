import { os } from "@orpc/server";
import z from "zod";

const publicRoute = os;

export const publicRouter = {
  enqueue: publicRoute.input(
    z.object({
      payload: z.base64(),
    }),
  ),
};
