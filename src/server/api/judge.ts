import { eventIterator } from "@orpc/server";
import { publicRoute } from "../orpc";
import { zJob, zJobStatusOrResult } from "../schemas";

export const judge = {
  submit: publicRoute
    .input(zJob.omit({ id: true }))
    .output(eventIterator(zJobStatusOrResult))
    .handler(async function* ({ input, context }) {
      const { redisManager, serverLogger } = context;
      const withId = {
        ...input,
        id: crypto.randomUUID(),
      };

      await redisManager.enqueueJob(withId);

      try {
        for await (const status of redisManager.jobStatusIterator(
          withId.id,
          10000,
        )) {
          if (status.status === "completed") {
            const result = await redisManager.fetchJobResult(withId.id);
            if (result === null) {
              throw new Error("failed to get job?");
            }
            yield status;
            yield result;
            return;
          } else if (status.status === "timed-out") {
            const result = await redisManager.fetchJobResult(withId.id);
            if (result === null) {
              yield status;
            } else {
              yield result;
            }
            return;
          }
        }
      } catch (e) {
        serverLogger.error(
          { msg: e.message, stack: e.stack },
          "Encountered error in the consumer loop",
        );
      }

      yield { status: "timed-out", type: "status", id: withId.id };
      return;
    }),
};
