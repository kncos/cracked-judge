import { $ } from "bun";
import { join } from "node:path";
import { fileExists } from "./utils";

type VmConfig = {
  jail: string;
  base: string;
  socks: string;
  workspace: string;
  sockPort?: number;
  uid?: string;
  gid?: string;
  mode?: string;
};

export const cleanLease = async (vmId: string, conf: VmConfig) => {
  // first, just unmount and rm -rf the cell if they exist. These commands
  // should fail if the mountpoints don't exist or the cell doesn't exist,
  // which is fine. Usually, they will fail assuming the cleanup procedure
  // works, but in the event that the program closed unexpectedly last time,
  // this should help to ensure we can create a fresh vm filesystem.
  const cell = join(conf.jail, "firecracker", vmId);
  const vmSocks = join(cell, "root", "socks");
  const vmBase = join(cell, "root", "base");
  const workCell = join(conf.workspace, vmId);

  await $`umount -l -R ${vmSocks}`.quiet().throws(false);
  await $`umount -l -R ${vmBase}`.quiet().throws(false);
  await $`rm -rf ${cell}`.quiet().throws(false);
  await $`rm -rf ${workCell}`.quiet().throws(false);
};

export const acquireLease = async (vmId: string, conf: VmConfig) => {
  await cleanLease(vmId, conf);
  const cell = join(conf.jail, "firecracker", vmId);
  const vmSocks = join(cell, "root", "socks");
  const vmBase = join(cell, "root", "base");
  const workCell = join(conf.workspace, vmId);
  const upper = join(workCell, "upper");
  const workdir = join(workCell, "workdir");

  // throws -- these are required for the mount operations
  try {
    await $`mkdir -p ${vmSocks}`.quiet();
    await $`mkdir -p ${vmBase}`.quiet();
    await $`mkdir -p ${workCell}`.quiet();
    await $`mkdir -p ${upper}`.quiet();
    await $`mkdir -p ${workdir}`.quiet();
  } catch (e) {
    await cleanLease(vmId, conf);
    throw new Error("Failed to create dirs for mountpoints", { cause: e });
  }

  try {
    await $`mount -t overlay overlay -o lowerdir="${conf.base}",upperdir="${upper}",workdir="${workdir}" ${vmBase}`.quiet();
    await $`mount --bind --map-users 0:${conf.uid}:65534 --map-groups 0:${conf.gid}:65534 ${conf.socks} ${vmSocks}`;
  } catch (e) {
    await cleanLease(vmId, conf);
    throw new Error("Failed to create mountpoints", { cause: e });
  }

  try {
    await $`chown -R ${conf.uid}:${conf.gid} ${vmBase}`.quiet();
    await $`chmod -R 777 ${vmBase}`.quiet();
  } catch (e) {
    await cleanLease(vmId, conf);
    throw new Error("Failed to change owner or mode of vmbase", { cause: e });
  }
};

export const getSocketPath = async (vmId: string, conf: VmConfig) => {
  const cell = join(conf.jail, "firecracker", vmId);
  const vmSocksDir = join(cell, "root", "socks");
  // the host will start listening on a socket in this directory,
  // and vmSocks directory will have a mount binding to this dir
  // with --map-users and --map-groups
  const hostSocksDir = join(conf.socks, vmId);

  // ensure the directories exist
  await $`mkdir -p ${vmSocksDir}`;
  await $`mkdir -p ${hostSocksDir}`;

  // firecracker expects us to be listening on a port w/ this name formatting
  const sockName = `v.sock_${conf.sockPort || 52}`;
  const sock = join(hostSocksDir, sockName);

  const portExists = fileExists(sock) || fileExists(join(vmSocksDir, sockName));
  if (portExists) {
    throw new Error(`Socket ${sockName} already exists for vmId ${vmId}`);
  }

  return sock;
};
