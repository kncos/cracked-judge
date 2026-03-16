import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/websocket";
import { type RouterClient } from "@orpc/server";
import type { AppRouter } from "./router";

// The guest client doesn't inject any context — context is server-side only.
type ClientContext = Record<never, never>;

const link = new RPCLink<ClientContext>({
  websocket: new WebSocket("ws://localhost:3000"),
});

const client = createORPCClient(link) as unknown as RouterClient<
  AppRouter,
  ClientContext
>;

const main = async () => {
  while (true) {
    // ...
  }
};

main();
