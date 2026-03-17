import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/websocket";
import type { RouterClient } from "@orpc/server";
import { env } from "bun";
import z from "zod";
import type { router } from "./router";

const websocket = new WebSocket("ws://localhost:3000");

const parsedEnv = z
  .object({
    VMID: z.optional(z.string()).default("ANON"),
  })
  .parse(env);

const link = new RPCLink({
  websocket,
  headers: {
    ...parsedEnv,
  },
});

export const client: RouterClient<typeof router> = createORPCClient(link);
