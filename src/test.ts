import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/websocket";
import { onError, os, type RouterClient } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import z from "zod";

const procedure = os.$context<{ value: number }>();

const testRouter = {
  add: procedure
    .input(
      z.object({
        a: z.number(),
        b: z.number(),
      }),
    )
    .output(z.number())
    .handler(async ({ input, context }) => {
      return input.a + input.b + context.value;
    }),
};

const handler = new RPCHandler(testRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

// client

const websocket = new WebSocket("ws://localhost:3000");

const link = new RPCLink({
  websocket,
});

const client: RouterClient<typeof testRouter> = createORPCClient(link);
