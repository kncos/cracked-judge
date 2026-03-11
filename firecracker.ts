import { $ } from "bun";
import { join, resolve } from "node:path";
import createClient from "openapi-fetch";
import type { paths } from "./firecracker-types";

// ── Config ────────────────────────────────────────────────────────────────────

const FIRECRACKER_BIN = resolve("./firecracker");
const JAILER_BIN = resolve("./jailer");
const KERNEL = resolve("./vmlinux-6.1.163");
const ROOTFS = resolve("./rootfs.ext4");
const VM_CONFIG = resolve("./vm-config.json");

const UID = 60000;
const GID = 60000;

// CIDs 0-2 are reserved by the vsock spec (hypervisor=0, local=1, host=2)
const BASE_CID = 3;

// ── Client ────────────────────────────────────────────────────────────────────

const makeClient = (socketPath: string) =>
  createClient<paths>({
    baseUrl: "http://localhost",
    fetch: (request) => {
      const url =
        typeof request === "string"
          ? request
          : (request as Request).url.replace(/^http:\/\/localhost/, "");
      return fetch(`http://localhost${url}`, {
        method: (request as Request).method,
        headers: (request as Request).headers,
        body: (request as Request).body,
        unix: socketPath,
      });
    },
  });

// ── Socket ────────────────────────────────────────────────────────────────────

const waitForSocket = async (
  socketPath: string,
  timeoutMs = 5000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      await fetch("http://localhost/", { unix: socketPath });
      return;
    } catch (e) {
      lastError = e;
      await Bun.sleep(100);
    }
  }

  throw new Error(
    `Socket ${socketPath} not ready after ${timeoutMs}ms: ${lastError}`,
  );
};

// ── VM Worker ─────────────────────────────────────────────────────────────────

export type VMWorker = {
  id: string;
  socketPath: string;
  client: ReturnType<typeof makeClient>;
  terminate: () => Promise<void>;
};

/**
 * Spawns a jailed Firecracker VM and waits until its API socket is ready.
 * Returns a client for the VM's API and a `terminate()` function to shut it down.
 *
 * The jailer places the socket at:
 *   <workdir>/firecracker/<vmId>/root/run/firecracker.socket
 *
 * @param vmId     Unique VM identifier (e.g. "vm0")
 * @param workdir  Base workspace directory
 * @param cid      Guest CID — must be unique across all *running* VMs on the host
 *                 (kernel/vhost-vsock requirement, unrelated to path partitioning).
 *                 CIDs 0-2 are reserved; use BASE_CID + index.
 */
export const spawnVM = async (
  vmId: string,
  workdir: string,
  cid: number,
): Promise<VMWorker> => {
  // Deterministic host-side path — no need to pass --api-sock
  const socketPath = join(
    workdir,
    "firecracker",
    vmId,
    "root",
    "run",
    "firecracker.socket",
  );

  // Pre-create the chroot root so we can drop files in before the jailer starts
  const chrootRoot = join(workdir, "firecracker", vmId, "root");
  await $`mkdir -p ${chrootRoot}`.quiet();

  // Copy kernel + rootfs into the chroot so the relative paths in the
  // config file resolve correctly when Firecracker runs inside the jail
  await $`cp --reflink=always ${KERNEL} ${join(chrootRoot, "vmlinux-6.1.163")}`.quiet();
  await $`cp --reflink=always ${ROOTFS}  ${join(chrootRoot, "rootfs.ext4")}`.quiet();

  // Write a per-VM config with a unique guest_cid (CIDs must be unique across
  // all running VMs on the host — the vhost-vsock kernel module uses the CID
  // to route guest-initiated packets, so sharing CIDs causes conflicts).
  const vmConfig = JSON.parse(await Bun.file(VM_CONFIG).text());
  vmConfig.vsock.guest_cid = cid;
  await Bun.write(
    join(chrootRoot, "vm-config.json"),
    JSON.stringify(vmConfig, null, 2),
  );

  // 2. FIX: Give ownership to the Jailer user (UID 60000)
  // This allows the Firecracker process to read/write these files.
  await $`chown ${UID}:${GID} ${join(chrootRoot, "rootfs.ext4")}`.quiet();
  await $`chown ${UID}:${GID} ${join(chrootRoot, "vmlinux-6.1.163")}`.quiet();
  await $`chown ${UID}:${GID} ${join(chrootRoot, "vm-config.json")}`.quiet();
  await $`chmod 777 ${join(chrootRoot)}`;

  const proc = Bun.spawn(
    [
      JAILER_BIN,
      "--exec-file",
      FIRECRACKER_BIN,
      "--uid",
      String(UID),
      "--gid",
      String(GID),
      "--id",
      vmId,
      "--chroot-base-dir",
      workdir,
      "--",
      "--config-file",
      join("vm-config.json"),
    ],
    {
      stdout: "inherit",
      stderr: "inherit",
    },
  );

  try {
    await waitForSocket(socketPath);
  } catch (e) {
    proc.kill();
    await proc.exited;
    throw e;
  }

  const client = makeClient(socketPath);

  const terminate = async () => {
    proc.kill();
    await proc.exited;
    await $`rm -rf ${join(workdir, "firecracker", vmId)}`.quiet();
  };

  return { id: vmId, socketPath, client, terminate };
};

// ── Main ──────────────────────────────────────────────────────────────────────

const main = async () => {
  const workdir = resolve(process.argv[2] ?? "./vm-workspace");

  console.log(`[*] workspace: ${workdir}`);
  await $`mkdir -p ${workdir}`.quiet();

  const vmIds = ["vm0", "vm1", "vm2"];
  const vsock_dir = (vmid: string) =>
    join(workdir, "firecracker", vmid, "root");
  const vsock_path = (vmid: string) => join(vsock_dir(vmid), "v.sock_52");

  // Listen on the AF_UNIX socket that Firecracker forwards guest vsock port 52
  // connections to. Each guest connection sends lines; we tag and print them.
  // The socket path must NOT exist as a directory — Bun.listen creates it as
  // a Unix socket file. We ensure the parent dir exists and remove any stale path.
  const listenForMessages = async (vmid: string): Promise<void> => {
    const sockPath = vsock_path(vmid);
    await $`mkdir -p ${vsock_dir(vmid)}`.quiet();
    await $`rm -f ${sockPath}`.quiet();

    return new Promise((resolve) => {
      const server = Bun.listen<{ buf: string }>({
        unix: sockPath,
        socket: {
          open(socket) {
            socket.data = { buf: "" };
          },
          data(socket, chunk) {
            socket.data.buf += new TextDecoder().decode(chunk);
            const lines = socket.data.buf.split("\n");
            socket.data.buf = lines.pop()!; // keep incomplete last line
            for (const line of lines) {
              if (line.trim()) console.log(`[${vmid}]: ${line}`);
            }
          },
          close() {},
          error(_, err) {
            console.error(`[${vmid}] socket error:`, err);
          },
        },
      });

      // Bun.listen() creates the socket file synchronously before returning.
      // Firecracker runs as UID/GID 60000 inside the jailer and needs to be
      // able to connect to this socket, so chown it now (we're running as root).
      $`chown ${UID}:${GID} ${sockPath}`.quiet();

      // Stop listening after 30 s (matches the old timeout)
      setTimeout(() => {
        server.stop();
        resolve();
      }, 30_000);
    });
  };

  const vsockListeners = Promise.all(vmIds.map((id) => listenForMessages(id)));

  console.log(`[*] spawning ${vmIds.length} VMs...`);
  const workers = await Promise.all(
    vmIds.map((id, i) => {
      console.log(`  [+] spawning ${id}`);
      return spawnVM(id, workdir, BASE_CID + i);
    }),
  );

  console.log("[*] all sockets ready, calling GET / on each VM");
  await Promise.all(
    workers.map(async ({ id, client }) => {
      const { data, error } = await client.GET("/");
      if (error) {
        console.error(`  [${id}] GET / error:`, error);
      } else {
        console.log(`  [${id}] GET / =>`, JSON.stringify(data));
      }
    }),
  );

  await vsockListeners;

  console.log("[*] terminating all VMs");
  await Promise.all(workers.map((w) => w.terminate()));
  console.log("[*] done");
};

await main();
