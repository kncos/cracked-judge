import {
  enqueueJob,
  fetchJobResult,
  JobStatusConsumer,
} from "@/server/typed-redis";
import { eventIterator } from "@orpc/server";
import { publicRoute } from "../orpc";
import { zJob, zJobStatusOrResult } from "../schemas";

export const judge = {
  submit: publicRoute
    .input(zJob)
    .output(eventIterator(zJobStatusOrResult))
    .handler(async function* ({ input, context }) {
      const { redis } = context;
      await enqueueJob(redis, input);

      const consumer = await JobStatusConsumer.create(redis, input.id, 10000);
      for await (const status of consumer) {
        if (status.status === "completed") {
          const result = await fetchJobResult(redis, input.id);
          if (result === null) {
            throw new Error("failed to get job?");
          }
          yield status;
          yield result;
          return;
        } else if (status.status === "timed-out") {
          const result = await fetchJobResult(redis, input.id);
          if (result === null) {
            yield status;
          } else {
            yield result;
          }
          return;
        }
      }

      yield { status: "timed-out", type: "status", id: input.id };
      return;
    }),
};
