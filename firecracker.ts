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

const createFirecracker = (id: string) => {
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
        if (await socketfile.exists()) {
          await socketfile.delete();
        }
      },
    },
  );

  const client = createFirecrackerClient(socket);
  return { client, proc, socket };
};

const waitForSocket = async (socket: string, timeoutMs = 2000) => {
  const timeoutms = 1000;
  const start = Date.now();
  while (Date.now() - start < timeoutms) {
    try {
      await fetch("http://localhost/", { unix: socket });
      return true;
    } catch {
      Bun.sleep(100);
    }
  }
  console.error("[ERROR] socket timed out...");
  return false;
};

const main = async () => {
  const { client, proc, socket } = createFirecracker("0");
  const socketOk = await waitForSocket(socket);
  if (!socketOk) {
    process.exit(-1);
  }

  const results = await Promise.all([
    client.PUT("/boot-source", {
      body: {
        kernel_image_path: "vmlinux-6.1.163",
        boot_args:
          "console=ttyS0 reboot=k panic=1 pci=off nomodule root=/dev/vda rw init=/sbin/busybox init",
      },
    }),
    client.PUT("/drives/{drive_id}", {
      body: {
        drive_id: "rootfs",
        path_on_host: "rootfs.ext4",
        is_root_device: true,
        is_read_only: false,
        io_engine: "Sync",
        cache_type: "Unsafe",
      },
      params: {
        path: {
          drive_id: "rootfs",
        },
      },
    }),
    client.PUT("/machine-config", {
      body: {
        mem_size_mib: 1024,
        vcpu_count: 1,
        smt: false,
        track_dirty_pages: false,
      },
    }),
  ]);

  const failed = results.find((r) => r.error);
  if (failed) {
    console.error(
      failed?.error?.fault_message || "failed but no fault_message",
    );
    proc.kill();
    process.exit(-1);
  }
};

await main();
