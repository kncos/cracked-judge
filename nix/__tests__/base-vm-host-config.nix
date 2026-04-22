{
  config,
  ...
}:
let
  # specify in the test nodes
  vmroot-block-dev = config.vmroot-block-dev.package;
in
{

  imports = [
    ./base-config.nix
    ../modules/firecracker-vm-mgr.nix
  ];

  # don't want to mount the bundle since we use vmroot-block-dev
  firecracker-vm-mgr.mount-bundle = false;

  # speeds up boot
  networking.useDHCP = false;
  # need xfs for CoW (speeds up vm-mgr by 10+ secs)
  boot.supportedFilesystems.xfs = true;

  # good for at least ~4 firecracker VMs for testing
  virtualisation.cores = 4;
  virtualisation.memorySize = 6144;

  # block device at /var/lib/cracked-judge, contains deps/ dir
  virtualisation.qemu.drives = [
    {
      name = "vmroot";
      file = "${vmroot-block-dev}";
      driveExtraOpts = {
        format = "raw";
        snapshot = "on";
      };
      deviceExtraOpts = {
        serial = "vmroot";
      };
    }
  ];

  virtualisation.fileSystems."/var/lib/cracked-judge" = {
    device = "/dev/disk/by-id/virtio-vmroot";
    fsType = "xfs";
    options = [ "noatime" ];
  };
}
