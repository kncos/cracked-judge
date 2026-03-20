import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { RPCLink as RPCLinkWs } from "@orpc/client/websocket";
import { os, type RouterClient } from "@orpc/server";
import { RPCHandler as RPCHandlerWs } from "@orpc/server/bun-ws";
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
    .handler(async ({ input }) => {
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
    .handler(async ({ input }) => {
      return input.a - input.b;
    }),
};

// r1 handled via WebSocket, r2 handled via HTTP
const wsHandler = new RPCHandlerWs(r1);
const httpHandler = new RPCHandler(r2, {
  plugins: [new CORSPlugin()],
});

const server = Bun.serve<{ openedAt: number }>({
  hostname: "localhost",
  port: 3000,
  async fetch(req, server) {
    console.log("fetch:", req.url);

    // Try HTTP handler first (for r2/sub)
    const { matched: httpMatched, response: httpRes } =
      await httpHandler.handle(req);
    if (httpMatched) return httpRes;

    // Upgrade to WebSocket for r1/add
    const isUpgraded = server.upgrade(req, {
      data: { openedAt: Date.now() },
    });
    if (!isUpgraded) {
      return new Response("WebSocket upgrade failed", { status: 500 });
    }
  },
  websocket: {
    async message(ws, message) {
      await wsHandler.message(ws, message, {
        context: { ...ws.data },
      });
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    async close(ws) {
      console.log("closed");
      wsHandler.close(ws);
    },
  },
});

await Bun.sleep(100);

// HTTP client for r2/sub
const httpLink = new RPCLink({ url: "http://localhost:3000" });
const httpClient: RouterClient<typeof r2> = createORPCClient(httpLink);

// WebSocket client for r1/add
const websocket = new WebSocket("ws://localhost:3000");
const wsLink = new RPCLinkWs({ websocket });
const wsClient: RouterClient<typeof r1> = createORPCClient(wsLink);

// Test HTTP route (r2/sub)
const { data: httpRes, error: httpErr } = await tryCatch(
  httpClient.sub({ a: 5, b: 3 }),
);
console.log("HTTP (sub):", httpRes ?? httpErr);

// Test WebSocket route (r1/add)
const { data: wsRes, error: wsErr } = await tryCatch(
  wsClient.add({ a: 5, b: 3 }),
);
console.log("WebSocket (add):", wsRes ?? wsErr);

await server.stop();
