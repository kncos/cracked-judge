import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/websocket";
import type { RouterClient } from "@orpc/server";
import type { router } from "./router";

const websocket = new WebSocket("ws://localhost:3000");

const link = new RPCLink({
  websocket,
});

export const client: RouterClient<typeof router> = createORPCClient(link);
