import { apiRouterContract } from "@cracked-judge/common/contract";
import { procLogHelper } from "@cracked-judge/common/proc";
import { implement, onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/bun-ws";
import JSZip from "jszip";
import path from "path";
import { guestLogger } from "../utils";

type CTX = { openedAt: number; workspace: string };
const oc = implement(apiRouterContract).$context<CTX>();
const serverLogger = guestLogger.child({}, { msgPrefix: "[mock-server] " });

export const createCppPayload = () => {
  const mainCpp = [
    "#include <iostream>",
    "int main() {",
    `  std::cout << "hello, world" << std::endl;`,
    "  return 0;",
    "}",
  ].join("\n");

  const compileSh =
    "#!/bin/sh\n" + "set -eux\n" + "g++ -std=gnu++26 -O2 *.cpp -o main\n";
  const runSh = "#!/bin/sh\n" + "./main";

  const zip = new JSZip();
  zip.file("main.cpp", mainCpp);
  zip.file("compile.sh", compileSh);
  zip.file("run.sh", runSh);
  return zip;
};

const serverMock = {
  worker: oc.worker.router({
    check: oc.worker.check.handler(() => {
      return { ok: true, message: "check success." };
    }),
    request: oc.worker.request.handler(({ context, input }) => {
      const { timeoutSec } = input;
      if (timeoutSec === 42) {
        return null;
      }

      const { workspace } = context;
      const file = Bun.file(path.join(workspace, "files.zip"));
      return {
        id: crypto.randomUUID(),
        files: new File([file], "files.zip"),
        isolateOpts: { cmd: [] },
        returnPayload: false,
      };
    }),
    submit: oc.worker.submit.handler(({ input }) => {
      const { payload, ...rest } = input;
      serverLogger.info(rest, "Got submission");
      if (payload) {
        serverLogger.info(`PAYLOAD SIZE: ${payload.size / 1024} KiB`);
      }
    }),
  }),
};

export const createMockServer = async () => {
  const handler = new RPCHandler<CTX>(serverMock, {
    interceptors: [
      onError((e) => {
        serverLogger.error(`Interceptor Error: ${e}`);
      }),
    ],
  });

  // meh good enough for now
  const workspace = path.resolve(`/tmp/server-${Date.now()}`);
  const cmd = ["mkdir", "-p", workspace];
  const proc = Bun.spawnSync(cmd);
  if (proc.exitCode !== 0) {
    procLogHelper(proc, cmd, serverLogger);
  }

  const somePayload = createCppPayload();
  const blob = await somePayload.generateAsync({ type: "blob" });
  await Bun.write(path.join(workspace, "files.zip"), blob);

  const server: Bun.Server<CTX> = Bun.serve({
    port: 3000,
    fetch(req, server) {
      const isUpgraded = server.upgrade(req, {
        data: { openedAt: Date.now(), workspace },
      });
      if (!isUpgraded) {
        return new Response("Failed to upgrade ws", { status: 500 });
      }
    },
    websocket: {
      async message(ws, message) {
        await handler.message(ws, message, { context: { ...ws.data } });
      },
      open() {
        serverLogger.info("Websocket connection opened");
      },
      close(ws) {
        const span = Date.now() - ws.data.openedAt;
        serverLogger.info(`Websocket connection closed after ${span}ms`);
      },
    },
  });
  const destroy = async () => {
    serverLogger.info("destroying server...");
    await server.stop(true);
  };

  return {
    server,
    destroy,
    async [Symbol.asyncDispose]() {
      await destroy();
    },
  } satisfies AsyncDisposable & {
    server: Bun.Server<CTX>;
    destroy: () => Promise<void>;
  };
};
