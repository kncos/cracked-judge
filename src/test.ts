import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { os, type RouterClient } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { CORSPlugin } from "@orpc/server/plugins";
import z from "zod";
import { tryCatch } from "./lib/utils";

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
    // separate h1 and h2
    const { matched: h1matched, response: h1res } = await h1.handle(req, {
      // prefix: "/r1",
    });
    if (h1matched) return h1res;

    const { matched: h2matched, response: h2res } = await h2.handle(req, {
      // prefix: "/r2",
    });
    if (h2matched) return h2res;

    return new Response("", { status: 404 });
  },
});

const link1 = new RPCLink({
  url: "http://localhost:3000",
});

const link2 = new RPCLink({
  url: "http://localhost:3000",
});

await Bun.sleep(1000);

export const client1: RouterClient<typeof r1> = createORPCClient(link1);
export const client2: RouterClient<typeof r2> = createORPCClient(link2);

const { data: c1_res } = await tryCatch(
  client1.add({
    a: 1,
    b: 2,
  }),
);

const { data: c2_res } = await tryCatch(
  client2.sub({
    a: 1,
    b: 2,
  }),
);

console.log(c1_res, c2_res);

await server.stop();
