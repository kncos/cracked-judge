import { $ } from "bun";
import { join, resolve } from "node:path";
import createClient from "openapi-fetch";
import type { paths } from "./firecracker-types";

// ── Config ────────────────────────────────────────────────────────────────────

const FIRECRACKER_BIN = resolve("./firecracker");
const JAILER_BIN = resolve("./jailer");
const KERNEL = resolve("./vmlinux-6.1.163");
const ROOTFS = resolve("./rootfs.ext4");

const UID = 60000;
const GID = 60000;

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
 */
export const spawnVM = async (
  vmId: string,
  workdir: string,
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

  console.log(`[*] spawning ${vmIds.length} VMs...`);
  const workers = await Promise.all(
    vmIds.map((id) => {
      console.log(`  [+] spawning ${id}`);
      return spawnVM(id, workdir);
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

  console.log("[*] terminating all VMs");
  await Promise.all(workers.map((w) => w.terminate()));
  console.log("[*] done");
};

await main();
