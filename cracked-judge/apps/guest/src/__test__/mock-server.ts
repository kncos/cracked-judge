import { apiRouterContract } from "@cracked-judge/common/contract";
import { procLogHelper } from "@cracked-judge/common/proc";
import { implement, onError, ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/bun-ws";
import JSZip from "jszip";
import path from "path";
import z, { ZodError } from "zod";
import { guestLogger } from "../utils";

type CTX = { openedAt: number; workspace: string };
const oc = implement(apiRouterContract)
  .$context<CTX>()
  .use(
    onError((error) => {
      if (
        error instanceof ORPCError &&
        error.code === "INTERNAL_SERVER_ERRROR"
      ) {
        const zodError =
          error.cause instanceof ZodError
            ? error.cause
            : // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
              new ZodError((error.cause as any).issues);

        console.error(
          "-".repeat(16),
          z.prettifyError(zodError),
          "-".repeat(16),
        );

        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: z.prettifyError(zodError),
        });
      }
    }),
  );
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
      const bunFile = Bun.file(path.join(workspace, "files.zip"));
      const files = new File([bunFile], "files.zip");
      const res = z.file().safeParse(files);
      if (!res.success) {
        console.error(`ZOD: malformed file:\n${z.prettifyError(res.error)}`);
      }

      return {
        id: crypto.randomUUID(),
        files,
        isolateOpts: { cmd: ["/bin/sh", "-c", '"ls -laR"'] },
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
  const handler = new RPCHandler<CTX>(serverMock.worker, {
    interceptors: [
      onError((e) => {
        const pre = "[interceptor] ";
        if (e instanceof ZodError) {
          console.error(`${pre}encountered zod error:` + z.prettifyError(e));
        } else if (e instanceof Error && e.cause instanceof ZodError) {
          console.error(
            `${pre}encountered error ${e}. Cause is zod error:\n` +
              z.prettifyError(e.cause),
          );
        } else if (e instanceof Error) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
            const zodError = new ZodError((e.cause as any).issues);
            console.error(`${pre}ZOD ERROR:`, z.prettifyError(zodError));
          } catch {
            console.error(`${pre}Couldn't interpret error. Fallback:`, e);
          }
        }
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
