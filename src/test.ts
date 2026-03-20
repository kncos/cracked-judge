import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { os, type RouterClient } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { CORSPlugin } from "@orpc/server/plugins";
import z from "zod";

const r1 = {
  add: os
    .input(
      z.object({
        a: z.number(),
        b: z.number(),
      }),
    )
    .output(z.number())
    .handler(async ({ input, context }) => {
      return input.a + input.b;
    }),
};
const r2 = {
  sub: os
    .input(
      z.object({
        a: z.number(),
        b: z.number(),
      }),
    )
    .output(z.number())
    .handler(async ({ input, context }) => {
      return input.a - input.b;
    }),
};

const root = {
  r1,
  r2,
};

const h1 = new RPCHandler(r1, {
  plugins: [new CORSPlugin()],
});
const h2 = new RPCHandler(r2);

const rootHandler = new RPCHandler(root);

const server = Bun.serve({
  hostname: "localhost",
  port: 3000,
  async fetch(req) {
    const { matched, response } = await rootHandler.handle(req);
    if (matched) {
      return response;
    }
    return new Response("Not Found", { status: 404 });
  },
});

const link1 = new RPCLink({
  url: "http://localhost:3000",
});

const link2 = new RPCLink({
  url: "http://localhost:3000",
});

await Bun.sleep(1000);

export const client1: RouterClient<typeof root> = createORPCClient(link1);
export const client2: RouterClient<typeof root> = createORPCClient(link2);

const c1_res = await client1.r1.add({
  a: 1,
  b: 2,
});

const c2_res = await client2.r2.sub({
  a: 1,
  b: 2,
});

console.log(c1_res, c2_res);

await server.stop();
