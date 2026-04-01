{
  pkgs,
  config ? null,
  kernelInitParam ?
    if config != null then
      "${config.system.build.toplevel}/init"
    else
      throw "initpath invalid for vm-config",
  rootfsPath ? "rootfs.ext4",
  kernelImagePath ? "vmlinux",
  initrdPath ? null,
  vsockPath ? null,
  vcpus ? 1,
  memoryMb ? 1024,
}:
pkgs.writeText "vm-config.json" (
  builtins.toJSON (
    {
      boot-source = {
        # this should be a firecracker upstream kernel with no modules
        kernel_image_path = "${kernelImagePath}";
        # We don't specify nix boot args because firecracker is the bootloader
        boot_args = "console=ttyS0 reboot=k panic=1 pci=off root=/dev/vda rw init=${kernelInitParam}";
      }
      # initrd is optional. NixOS depends on initrd to perform "stage 1" setup.
      # It loads kernel modules, starts udev, mounts filesytems, runs fsck, handles luks/raid,
      # and handles hibernate resume. But for firecracker, we don't need any of that,
      # so initrd can be skipped
      // pkgs.lib.optionalAttrs (initrdPath != null) {
        initrd_path = initrdPath;
      };
      drives = [
        {
          drive_id = "rootfs";
          path_on_host = "${rootfsPath}";
          is_root_device = true;
          is_read_only = false;
        }
      ];
      machine-config = {
        vcpu_count = vcpus;
        mem_size_mib = memoryMb;
      };
    }
    # vsock is how we communicate with the outside world, there is no
    # networking. Without this, the only way to access it would be to use a shell
    // pkgs.lib.optionalAttrs (vsockPath != null) {
      vsock = {
        guest_cid = 3;
        uds_path = "${vsockPath}";
      };
    }
  )
)
