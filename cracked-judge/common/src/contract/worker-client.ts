import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/websocket";
import type { ContractRouterClient } from "@orpc/contract";
import type { apiRouterContract } from "./api";

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
    public readonly client: ContractRouterClient<
      typeof apiRouterContract.worker
    >,
    private readonly websocket: WebSocket,
  ) {}

  static async create(url: string = "ws://localhost:3000") {
    const websocket = new WebSocket(url);
    await waitForOpen(websocket);
    const wsLink = new RPCLink({ websocket });
    const client: ContractRouterClient<typeof apiRouterContract.worker> =
      createORPCClient(wsLink);
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
