import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { RPCLink as RPCLinkWs } from "@orpc/client/websocket";
import type { RouterClient } from "@orpc/server";
import type { judge } from "./api/judge";
import type { vm } from "./api/vm";

// client for VMs to use
const websocket = new WebSocket("ws://localhost:3000");
const vmLink = new RPCLinkWs({
  websocket,
});
export const vmClient: RouterClient<typeof vm> = createORPCClient(vmLink);

// public client for users to submit jobs
const judgeLink = new RPCLink({
  url: "http://localhost:3000",
});
export const judgeClient: RouterClient<typeof judge> =
  createORPCClient(judgeLink);
