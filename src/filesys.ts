import { $ } from "bun";
import { mkdir } from "node:fs/promises";
import path, { join } from "node:path";

const DUID = 60000;
const DGID = 60000;
const DMOD = 0o777;

const addBinds = async (params: {
  dest: string;
  binds: string[];
  uid?: number;
  gid?: number;
}) => {
  const { dest, binds, uid = DUID, gid = DGID } = params;

  await Promise.all(
    binds.map(async (bindPath) => {
      const name = path.basename(bindPath);
      const bindDest = join(dest, name);
      await mkdir(bindDest, { recursive: true });
      // will this work if the host file isn't owned by root (uid 0)?
      await $`mount --bind --idmap u:0:${uid}:1 g:0:${gid}:1 ${bindPath} ${bindDest}`;
    }),
  );

  const destroy = async () => {
    await Promise.all(
      binds.map(async (bindPath) => {
        const name = path.basename(bindPath);
        const bindDest = join(dest, name);
        await $`umount -l ${bindDest}`;
      }),
    );
  };
  return { destroy };
};

const addOverlay = async (params: {
  dest: string;
  src: string;
  workspaceDir: string;
  uid?: number;
  gid?: number;
  mode?: number;
}) => {
  const {
    dest,
    src,
    workspaceDir,
    uid = DUID,
    gid = DGID,
    mode = DMOD,
  } = params;
  const upper = join(workspaceDir, "upper");
  const workdir = join(workspaceDir, "workdir");
  await Promise.all([
    mkdir(workspaceDir, { recursive: true }),
    mkdir(upper, { recursive: true }),
    mkdir(workdir, { recursive: true }),
    mkdir(dest, { recursive: true }),
  ]);

  await $`mount -t overlay overlay -o lowerdir="${src}",upperdir="${upper}",workdir="${workdir}" ${dest}`;
  await $`chown -R ${uid}:${gid} ${dest}`;
  await $`chmod -R ${mode} ${dest}`;

  const destroy = async () => {
    await $`umount -l ${dest}`;
    await $`rm -rf ${dest} ${workspaceDir}`;
  };
  return { destroy };
};

export class VmFilesys {
  _socksDir: string;
  _baseDir: string;
  _jailerRoot: string;
  _workspaceDir: string;

  constructor(params: {
    socksDir: string;
    baseDir: string;
    jailerRoot: string;
    workspaceDir: string;
  }) {
    const { socksDir, baseDir, jailerRoot, workspaceDir } = params;
    this._socksDir = socksDir;
    this._baseDir = baseDir;
    this._jailerRoot = jailerRoot;
    this._workspaceDir = workspaceDir;
  }

  create = async (vmId: string) => {
    const chroot = join(this._jailerRoot, "firecracker", vmId, "root");
    const vmSocks = join(this._socksDir, vmId, "socks");
    const { destroy: destroyOverlay } = await addOverlay({
      dest: chroot,
      src: this._baseDir,
      workspaceDir: join(this._workspaceDir, vmId),
    });

    const { destroy: destroyBinds } = await addBinds({
      dest: chroot,
      binds: [vmSocks],
    });

    const destroy = async () => {
      await destroyBinds();
      await destroyOverlay();
    };
    return { destroy };
  };
}
