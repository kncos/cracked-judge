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
      const { redisPool, serverLogger } = context;

      await enqueueJob(redis, input);

      await using consumer = await JobStatusConsumer.create(
        redis,
        input.id,
        10000,
      );
      try {
        for await (const status of consumer) {
          if (status.status === "completed") {
            await consumer.destroy();
            const result = await fetchJobResult(redis, input.id);
            if (result === null) {
              throw new Error("failed to get job?");
            }
            yield status;
            yield result;
            return;
          } else if (status.status === "timed-out") {
            await consumer.destroy();
            const result = await fetchJobResult(redis, input.id);
            if (result === null) {
              yield status;
            } else {
              yield result;
            }
            return;
          }
        }
      } catch (e) {
        serverLogger.error({ e }, "Encountered error in the consumer loop");
      }

      yield { status: "timed-out", type: "status", id: input.id };
      return;
    }),
};
