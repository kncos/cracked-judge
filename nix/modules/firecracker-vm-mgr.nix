{
  pkgs,
  lib,
  config,
  ...
}:
let
  cfg = config.firecracker-vm-mgr;
  firecracker-vm-mgr = pkgs.callPackage ../pkgs/firecracker-vm-mgr.nix { };
in
{
  # unconditionally requires isolate to operate
  options.firecracker-vm-mgr = {
    enable = lib.mkEnableOption "Installs the firecracker-vm-mgr service";

    num-workers = lib.mkOption {
      type = lib.types.nullOr lib.types.ints.between 0 256;
      default = 0;
      description = ''
        Number of VMs to spawn (starts systemd firecracker-vm@.service units).
        Integer between 0 and 256 inclusive. If 0, no service units will be started.
      '';
    };

    # depends on @/nix/pkgs/firecracker (default target)
    firecracker-bundle = lib.mkOption {
      type = lib.types.package;
      default = throw ''
        firecracker-vm-mgr.firecracker-bundle must be set. This dependency is
        set as an option because it requires a nixosSystem and the package should
        be called at the flake scope as a result.
      '';
      description = "Derivation for firecracker-bundle (contains rootfs.ext4, vmlinux, vm-config.json)";
    };
  };

  config = lib.mkIf cfg.enable {
    # using this for debugging mostly
    environment.systemPackages = [ firecracker-vm-mgr ];

    fileSystems."/var/lib/cracked-judge/deps" = {
      device = "${cfg.firecracker-bundle}";
      fsType = "none";
      options = [
        "bind"
        "ro"
      ];
    };

    systemd.services."firecracker-vm@" = {
      description = "Firecracker VM %i";
      after = [
        "network.target"
        "var-lib-cracked\\x2djudge-deps.mount"
      ];
      requires = [ "var-lib-cracked\\x2djudge-deps.mount" ];

      serviceConfig = {
        Type = "simple";
        ExecStart = "${firecracker-vm-mgr}/bin/firecracker-vm-mgr start %i";
        ExecStop = "${firecracker-vm-mgr}/bin/firecracker-vm-mgr stop %i";
        Restart = "on-failure";
        TimeoutStopSec = "30s";
      };
    };

    systemd.targets.multi-user.wants = builtins.genList (
      i: "firecracker-vm@${toString i}.service"
    ) cfg.num-workers;
  };
}
