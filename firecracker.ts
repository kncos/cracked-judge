// run with bun run; this is a basic script i'm using
// to communicate with firecracker api

import createClient from "openapi-fetch";
import type { paths } from "./firecracker-types";

export const createFirecrackerClient = (socketPath: string) => {
  return createClient<paths>({
    baseUrl: "http://localhost",
    fetch: (request: Request | string, init?: RequestInit) => {
      const url =
        typeof request === "string"
          ? request
          : (request as Request).url.replace(/^http:\/\/localhost/, "");

      return fetch(`http://localhost${url}`, {
        ...init,
        unix: socketPath,
      });
    },
  });
};

const machines = [];

const createFirecracker = () => {
  const id = machines.length + 1;
  const vmname = `vm-${id}`;
  const socket = `${vmname}.socket`;
  const proc = Bun.spawn(
    [
      "jailer",
      "--exec-file",
      "/bin/firecracker",
      "--gid",
      "60000",
      "--id",
      vmname,
      "--uid",
      "60000",
      "--",
      "--api-sock",
      socket,
    ],
    {
      async onExit(proc, exitCode, signalCode, error) {
        const socketfile = Bun.file(socket);
        await socketfile.delete();
      },
    },
  );
  const client = createFirecrackerClient(socket);
  machines.push({ client, proc });
};

const main = () => {};
