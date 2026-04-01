# guest/targets/firecracker.nix
{ pkgs, lib, nixosConfig, ... }:
{
  boot.loader.grub.enable = false;
  boot.kernel.enable = false;

  # Disable the systemd initrd — it requires a real kernel with modules.
  # Instead use the minimal NixOS stage-1 which can run without any modules.
  boot.initrd.systemd.enable = false;

  # No modules exist in the firecracker kernel (everything is =y)
  boot.initrd.includeDefaultModules = false;
  boot.initrd.availableKernelModules = lib.mkForce [ ];
  boot.initrd.kernelModules = lib.mkForce [ ];
  boot.kernelModules = lib.mkForce [ ];
  boot.extraModulePackages = lib.mkForce [ ];

  # Tell NixOS which kernel to use for building the initrd.
  # We point it at a real package so it can build the initrd scripts,
  # but since there are no modules it will be tiny.
  boot.kernelPackages = lib.mkForce pkgs.linuxPackages;

  systemd.services = {
    # Networking stuff: none of this is needed because we only need loopback
    network-setup.enable = false;
    NetworkManager.enable = false;
    firewall.enable = false;
    resolvconf.enable = false;

    # other unnecessary stuff, not needed
    systemd-udevd.enable = false;
    systemd-timesyncd.enable = false;
    systemd-journald-audit.enable = false;
    systemd-udev-trigger.enable = false;
  };

  systemd.targets = {
    hibernate.enable = false;
    hybrid-sleep.enable = false;
    sleep.enable = false;
    suspend.enable = false;
  };

  systemd.services."serial-getty@ttyS0" = {
    enable = true;
    wantedBy = [ "multi-user.target" ];
  };

  networking.enableIPv6 = false;
  networking.useDHCP = false;
  networking.interfaces = lib.mkForce { };

  systemd.defaultUnit = "multi-user.target";
  systemd.network.wait-online.enable = false;

  fileSystems."/" = {
    device = "/dev/vda";
    fsType = "ext4";
    options = [
      "rw"
      "relatime"
    ];
  };
}
