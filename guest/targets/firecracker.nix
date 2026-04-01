{ pkgs, lib, ... }:
{
  # no bootloader needed for firecracker
  boot.loader.grub.enable = false;
  # w/ firecracker we bring our own vmlinux
  boot.kernel.enable = false;

  systemd.services = {
    systemd-udevd.enable = false;
    systemd-timesyncd.enable = false;
    systemd-journald-audit.enable = lib.mkForce false;
    NetworkManager.enable = lib.mkForce false;
  };

  systemd.targets = {
    hibernate.enable = false;
    hybrid-sleep.enable = false;
    sleep.enable = false;
    suspend.enable = false;
  };

  # firecracker kernel has no modules
  boot.initrd = {
    includeDefaultModules = false;
    kernelModules = [ ];
  };

  networking.enableIPv6 = false;

  systemd.defaultUnit = "multi-user.target";

  systemd.network.wait-online.enable = false;
  boot.initrd.systemd.network.wait-online.enable = false;
}
