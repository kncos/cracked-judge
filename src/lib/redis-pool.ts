import { DisposableRedis } from "@/types/redis";
import genericPool from "generic-pool";

const factory = {
  create: async function () {
    return Promise.resolve(new DisposableRedis());
  },
  validate: async function (client: DisposableRedis) {
    //? is 'end' the only state that won't just connect/work?
    return Promise.resolve(client.status !== "end");
  },

  // note: test async with this
  destroy: async function (client: DisposableRedis) {
    await client[Symbol.asyncDispose]();
  },
};

const opts = {
  min: 2,
  max: 128,
};

export const redisPool: genericPool.Pool<DisposableRedis> =
  genericPool.createPool(factory, opts);
