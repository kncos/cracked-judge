import { enqueueJob } from "@/lib/typed-redis";
import { eventIterator } from "@orpc/server";
import z from "zod";
import { publicRoute } from "../orpc";
import { zJob, zJobFinalResult, zJobPartialStatus } from "../schemas";

export const publicRouter = {
  enqueue: publicRoute
    .input(zJob)
    .output(
      eventIterator(
        z.discriminatedUnion("type", [zJobFinalResult, zJobPartialStatus]),
      ),
    )
    .handler(async function* ({ input, context }) {
      const { redis } = context;
      const { lang, file } = input;
      await enqueueJob(redis, lang, file);
    }),
};
