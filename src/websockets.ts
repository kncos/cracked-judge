// experimentation file for testing purposes...

import { logger } from "./lib/logger";

import { createInterface } from "node:readline";

const serverLogger = logger.child({}, { msgPrefix: "[Server] " });

const server = Bun.serve({
  port: 3000,
  fetch(req, server) {
    serverLogger.info("received fetch request");

    if (server.upgrade(req)) {
      serverLogger.info({ ...req }, "upgraded connection");
      return;
    }

    return new Response("Upgrade failed", { status: 500 });
  },
  websocket: {
    message(ws, message) {
      serverLogger.info({ message }, "[Server] received message");
      ws.send("hello from server");
    },
    close(ws) {
      serverLogger.info("WebSocket connection closed");
    },
    open(ws) {
      serverLogger.info("WebSocket connection opened");
    },
  },
});

// const clientLogger = logger.child({}, { msgPrefix: "[Client] " });
// const client = new WebSocket(`ws://localhost:3000`);
// client.addEventListener("open", () => {
//   clientLogger.info("Websocket Connection opened.");
// });
// client.addEventListener("close", () => {
//   clientLogger.info("Websocket Connection closed.");
// });
// client.addEventListener("message", (event) => {
//   clientLogger.info({ data: event.data }, "received new message");
// });

const rl = createInterface({
  input: process.stdin,
});

for await (const line of rl) {
  const segments = line
    .trim()
    .split(" ")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (segments.length === 0) {
    continue;
  }

  if (segments[0] === "exit") {
    rl.close();
    await server.stop();
    break;
  }
}
