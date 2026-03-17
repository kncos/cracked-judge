import { $ } from "bun";
import { join } from "node:path";
import { type VmConfig } from ".";

const bindMount = async (params: {
  uid: string;
  gid: string;
  hostDir: string;
  guestDir: string;
}) => {
  const { uid, gid, hostDir, guestDir } = params;
  await $`mount --bind --map-users 0:${uid}:65534 --map-groups 0:${gid}:65534 ${hostDir} ${guestDir}`.quiet();
};

export class VmFilesystem implements AsyncDisposable {
  private constructor(
    public readonly vmId: string,
    public readonly vmConf: VmConfig,
  ) {
    const cell = join(vmConf.jail, "firecracker", vmId);
    this.cell = cell;
    // vmsocks is where the sockets that the vm uses in the
    // chroot directory will be stored
    this.vmSocks = join(cell, "root", "run");
    this.vmBase = join(cell, "root", "base");
    const workCell = join(vmConf.workspace, vmId);
    this.workCell = workCell;
    this.upper = join(workCell, "upper");
    this.workdir = join(workCell, "workdir");
    // hostsocks is where the socket will be stored on the
    // host, this will bind mount to the vmSocks path. The host
    // can start listening on a socket in this directory, then
    // the VM will see it in its chroot directory.
    this.hostSocks = join(vmConf.socks, vmId);
  }
  private readonly cell: string;
  private readonly vmSocks: string;
  private readonly vmBase: string;
  private readonly workCell: string;
  private readonly upper: string;
  private readonly workdir: string;
  private readonly hostSocks: string;

  /**
   * returns the socket that the host can use to initiate communications with the guest.
   * The guest should be listening with VSOCK-LISTEN before you connect to this on the host.
   * You will need to send a `CONNECT {port}` Message, and will receive `OK` response.
   * `Default port: 52`
   * @see {@link https://github.com/firecracker-microvm/firecracker/blob/main/docs/vsock.md#host-initiated-connections|Host Initiated Connections}
   */
  get hostInitiatedSocketPath() {
    return join(this.hostSocks, "v.sock");
  }

  /**
   * returns the socket with port suffix that the guest will initiate communication on.
   * You should be listening on this socket before the VM starts if you expect guest comms.
   * `Default port: 52`
   * @see {@link https://github.com/firecracker-microvm/firecracker/blob/main/docs/vsock.md#guest-initiated-connections|Guest Initiated Connections}
   */
  get guestInitiatedSocketPath() {
    return join(this.hostSocks, `v.sock_${this.vmConf.sockPort || "52"}`);
  }

  get firecrackerApiSocketPath() {
    return join(this.hostSocks, `firecracker.socket`);
  }

  /**
   * Unmounts any mountpoints in the VM's jail cell.
   * Deletes the vm jail cell, workspace directory (contains upper/workdir for overlayfs),
   * and the host socks directory for this vm
   * @param vmId id of the vm to remove the filesystem for
   * @param conf vmconfig used to set up that VM
   */
  static destroy = async (vmId: string, conf: VmConfig) => {
    const vmfs = new VmFilesystem(vmId, conf);
    // first, just unmount and rm -rf the cell if they exist. These commands
    // should fail if the mountpoints don't exist or the cell doesn't exist,
    // which is fine. Usually, they will fail assuming the cleanup procedure
    // works, but in the event that the program closed unexpectedly last time,
    // this should help to ensure we can create a fresh vm filesystem.
    // const vmfs = new VmFilesystem(vmId, conf);
    await $`umount -l -R ${vmfs.vmSocks}`.quiet().throws(false);
    await $`umount -l -R ${vmfs.vmBase}`.quiet().throws(false);
    await $`rm -rf ${vmfs.cell}`.quiet().throws(false);
    await $`rm -rf ${vmfs.workCell}`.quiet().throws(false);
    await $`rm -rf ${vmfs.hostSocks}`.quiet().throws(false);
  };

  destroy = async () => {
    await VmFilesystem.destroy(this.vmId, this.vmConf);
  };

  static create = async (
    vmId: string,
    conf: VmConfig,
  ): Promise<VmFilesystem> => {
    const vmfs = new VmFilesystem(vmId, conf);
    await vmfs.destroy();

    // throws -- these are required for the mount operations
    try {
      await $`mkdir -p ${vmfs.vmSocks}`.quiet();
      await $`mkdir -p ${vmfs.vmBase}`.quiet();
      await $`mkdir -p ${vmfs.workCell}`.quiet();
      await $`mkdir -p ${vmfs.upper}`.quiet();
      await $`mkdir -p ${vmfs.workdir}`.quiet();
      await $`mkdir -p ${vmfs.hostSocks}`.quiet();
    } catch (e) {
      await vmfs.destroy();
      throw new Error("Failed to create dirs for mountpoints", { cause: e });
    }

    try {
      await $`mount -t overlay overlay -o lowerdir="${conf.base}",upperdir="${vmfs.upper}",workdir="${vmfs.workdir}" ${vmfs.vmBase}`.quiet();
      // mount bind allows us to listen on a socket in the managed hostSocks directory (outside vm chroot) as root,
      // and for the vm to see the socket in its chroot directory as owned by itself. The mappings allow the VM to
      // have permission to read/write from the socket even though root initializing the connection means the file
      // belongs to root on the hostSocks path.
      //* note: firecracker is now in the same dir
      await bindMount({
        ...conf,
        hostDir: vmfs.hostSocks,
        guestDir: vmfs.vmSocks,
      });
    } catch (e) {
      await vmfs.destroy();
      throw new Error("Failed to create mountpoints", { cause: e });
    }

    try {
      await $`chown -R ${conf.uid}:${conf.gid} ${vmfs.vmBase}`.quiet();
      await $`chmod -R 777 ${vmfs.vmBase}`.quiet();
    } catch (e) {
      await vmfs.destroy();
      throw new Error("Failed to change owner or mode of vmbase", { cause: e });
    }

    return vmfs;
  };

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }
}
