import { tryCatch } from "@/lib/utils";
import z from "zod";
import { publicRoute } from "../orpc";

export const publicRouter = {
  enqueue: publicRoute
    .input(
      z.object({
        lang: z.enum(["cpp", "python"]),
        file: z.file(),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { redis, serverLogger } = context;
      const { lang, file } = input;
      const { error } = await tryCatch(redis.lpush("job", lang, file));
      if (error) {
        return { success: false };
      }
    }),
};
