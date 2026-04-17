import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { RPCLink as RPCLinkWs } from "@orpc/client/websocket";
import type { RouterClient } from "@orpc/server";
import type { user, worker } from "./api";

// client for VMs to use
// const websocket = new WebSocket("ws://localhost:3000");
// const vmLink = new RPCLinkWs({
//   websocket,
// });
//
// export const workerClient: RouterClient<typeof worker> =
//   createORPCClient(vmLink);

// public client for users to submit jobs
const judgeLink = new RPCLink({
  url: "http://localhost:3000",
});

export const judgeClient: RouterClient<typeof user> =
  createORPCClient(judgeLink);

function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }
    ws.addEventListener(
      "open",
      () => {
        resolve();
      },
      { once: true },
    );
    ws.addEventListener(
      "error",
      (e) => {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(e);
      },
      { once: true },
    );
  });
}

export class WorkerClient implements AsyncDisposable, Disposable {
  private constructor(
    public readonly url: string,
    public readonly client: RouterClient<typeof worker>,
    private readonly websocket: WebSocket,
  ) {}

  static async create(url: string) {
    const websocket = new WebSocket(url);
    await waitForOpen(websocket);
    const wsLink = new RPCLinkWs({ websocket });
    const client: RouterClient<typeof worker> = createORPCClient(wsLink);
    return new WorkerClient(url, client, websocket);
  }

  destroy() {
    this.websocket.close();
  }

  [Symbol.dispose]() {
    this.destroy();
  }

  async [Symbol.asyncDispose]() {
    this.destroy();
    return Promise.resolve();
  }
}
