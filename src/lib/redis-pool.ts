import { DisposableRedis } from "@/types/redis";
import genericPool from "generic-pool";

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
    return Promise.resolve(client.status === "ready");
  },

  // note: test async with this
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
