import { $ } from "bun";
import { join } from "path";
import { VmFilesys } from "./filesys";

const root = "/tmp/vm-tests";
const base = join(root, "base");
const socks = join(root, "socks");
const workspace = join(root, "workspace");
const jail = join(root, "jail");

const vmfs = new VmFilesys({
  socksDir: socks,
  baseDir: base,
  jailerRoot: jail,
  workspaceDir: workspace,
});

const listenOnSocket = (vmId: string, port: number = 52) => {
  const server = Bun.listen<{ buf: string }>({
    unix: join(socks, vmId, "socks", `v.sock_${port}`),
    socket: {
      open(socket) {
        socket.data = { buf: "" };
      },
      data(socket, chunk) {
        socket.data.buf += new TextDecoder().decode(chunk);
        const lines = socket.data.buf.split("\n");
        socket.data.buf = lines.pop()!; // keep incomplete last line
        for (const line of lines) {
          if (line.trim()) console.log(`[${vmId}]: ${line}`);
        }
      },
      close() {
        console.log(`[${vmId}] socket closed`);
      },
      error(_, err) {
        console.error(`[${vmId}] socket error:`, err);
      },
    },
  });

  return { server };
};

export const createVm = async (vmId: string) => {
  const { destroy: destroyFs } = await vmfs.create(vmId);
  // const { server } = listenOnSocket(vmId);
  const sockPath = join(socks, vmId, `v.sock_52`);
  const socat = Bun.spawn(
    ["socat", "-", `UNIX-LISTEN:${sockPath},fork,reuseaddr,unlink-early`],
    {
      stdout: "inherit",
      stderr: "inherit",
    },
  );

  const proc = Bun.spawn(
    [
      "./jailer",
      "--exec-file",
      "./firecracker",
      "--uid",
      "60000",
      "--gid",
      "60000",
      "--id",
      vmId,
      "--chroot-base-dir",
      jail,
      "--",
      "--config-file",
      "base/vm-config.json",
    ],
    {
      stdout: "inherit",
      stderr: "inherit",
    },
  );

  console.log("--- vm spawned ---");
  await $`tree -pug ${jail}`;
  await $`tree -pug ${socks}`;
  console.log("--- ---");

  const destroy = async () => {
    console.log("--- destroying vm ---");
    // server.stop();
    proc.kill();
    socat.kill();
    await destroyFs();
  };
  return { destroy };
};
