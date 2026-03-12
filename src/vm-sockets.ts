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

const listenOnSocket = async (vmId: string, port: number = 52) => {
  const server = Bun.serve({
    unix: join(socks, vmId, "socks", `v.sock_${port}`),
    async fetch(req) {
      const buf = await req.arrayBuffer();
      const str = new TextDecoder().decode(buf);
      console.log(`[${vmId} SOCKET] ${str}`);
      return new Response("Received");
    },
  });
  return { server };
};

export const createVm = async (vmId: string) => {
  const { destroy: destroyFs } = await vmfs.create(vmId);
  const { server } = await listenOnSocket(vmId);

  const proc = Bun.spawn([
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
    "vm-config.json",
  ]);

  const destroy = async () => {
    await server.stop();
    await destroyFs();
  };
  return { destroy };
};
