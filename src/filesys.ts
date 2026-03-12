import { $ } from "bun";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tryCatch } from "./utils";

const DUID = 60000;
const DGID = 60000;
const DMOD = 777;

const addBind = async (params: {
  src: string;
  dest: string;
  uid?: number;
  gid?: number;
}) => {
  const { src, dest, uid = DUID, gid = DGID } = params;
  await Promise.all([
    mkdir(src, { recursive: true }),
    mkdir(dest, { recursive: true }),
  ]);
  await $`mount --bind --map-users 0:${uid}:60000 --map-groups 0:${gid}:60000 ${src} ${dest}`;

  const destroy = async () => await $`umount -l ${dest}`;
  return { destroy };
};

const addOverlay = async (params: {
  /** The directory to mount the overlay into */
  dest: string;
  /** The read-only lower layer */
  src: string;
  /** Where to store upper/ and workdir/ (overlay state, outside the chroot) */
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

  const destroy = async () => await $`umount -l ${dest}`;
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
    const baseDir = join(chroot, "base");
    const socksDir = join(chroot, "socks");
    const vmSocks = join(this._socksDir, vmId);

    const { data: overlayData, error: overlayError } = await tryCatch(
      addOverlay({
        dest: baseDir,
        src: this._baseDir,
        workspaceDir: join(this._workspaceDir, vmId),
      }),
    );
    if (overlayError) {
      console.log("[ADDOVERLAY ERROR]", overlayError);
      process.exit(-1);
    }

    const { data: bindData, error: bindError } = await tryCatch(
      addBind({
        src: vmSocks,
        dest: socksDir,
      }),
    );
    if (bindError) {
      console.log("[ADDBIND ERROR]", bindError);
      await overlayData.destroy();
      process.exit(-1);
    }

    const destroy = async () => {
      // unmount inner mounts first, then rm the whole chroot tree
      await bindData.destroy();
      await overlayData.destroy();
      await $`rm -rf ${chroot}`;
    };
    return { destroy };
  };
}
