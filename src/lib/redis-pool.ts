import { DisposableRedis } from "@/types/redis";
import genericPool from "generic-pool";
import { baseLogger } from "./logger";

const poolLogger = baseLogger.child({}, { msgPrefix: "[REDIS POOL] " });

export const redisPoolFactory: genericPool.Factory<DisposableRedis> = {
  create: async function () {
    const client = new DisposableRedis();
    await new Promise((res, rej) => {
      client.once("ready", res);
      client.once("error", rej);
    });
    return client;
  },
  validate: async function (client: DisposableRedis) {
    const ready = await Promise.resolve(client.status === "ready");
    const subscriber = client.condition?.subscriber;
    if (client.condition?.subscriber !== false) {
      poolLogger.fatal({ subscriber }, "CLIENT IS SUBSCRIBED?");
    }

    return ready;
  },

  destroy: async function (client: DisposableRedis) {
    await client[Symbol.asyncDispose]();
  },
};

export const createRedisPool = async () => {
  const pool = genericPool.createPool(redisPoolFactory, { min: 2, max: 128 });
  await pool.ready();
  return pool;
};

export type RedisPool = Awaited<ReturnType<typeof createRedisPool>>;
