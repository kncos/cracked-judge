import { zJobResolved, zJobStatusOrResult } from "@/orpc/schemas";
import Redis from "ioredis";
import type z from "zod";
import { tryCatch } from "./utils";

export const JOB_QUEUE = "jobs" as const;
export const JOB_RESULTS = "results" as const;

const keys = {
  job: (id: string) => `job:${id}` as const,
  result: (id: string) => `result:${id}` as const,
};

export async function enqueueJob(
  redis: Redis,
  input: z.infer<typeof zJobResolved>,
) {
  const jobId = input.id;
  const { data, error } = await tryCatch(
    redis.multi().lpush(JOB_QUEUE, jobId).hset(keys.job(jobId), input).exec(),
  );

  if (error || data === null) {
    throw new Error("failed to enqueue job");
  }

  return jobId;
}

export async function consumeJob(
  redis: Redis,
  timeout: number,
): Promise<z.infer<typeof zJobResolved> | null> {
  const { data: brpopData, error: brpopError } = await tryCatch(
    redis.brpop(JOB_QUEUE, timeout),
  );
  if (brpopError) {
    throw new Error("Failed to retrieve job");
  }
  if (brpopData === null) {
    return null;
  }

  const key = keys.job(brpopData[1]);
  const data = await redis.multi().hgetall(key).del(key).exec();
  return zJobResolved.parse(data);
}

// pub
export async function submitJobStatus(
  redis: Redis,
  input: z.infer<typeof zJobStatusOrResult>,
) {
  const key = keys.result(input.id);
  await redis.multi().hset(key, input).publish(JOB_RESULTS, key).exec();
}

// sub
export async function* consumeJobResult(
  redis: Redis,
  id: string,
  timeout: number,
): AsyncGenerator<z.infer<typeof zJobStatusOrResult>> {
  const key = keys.result(id);
  await redis.subscribe();
  // ... each time we hear a message for a job, I will yield the result
}
