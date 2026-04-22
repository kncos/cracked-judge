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

    mount-bundle = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = ''
        Create bind mount for firecracker dependencies from /nix/store
        to /var/lib/cracked-judge/deps
      '';
    };

    num-workers = lib.mkOption {
      type = lib.types.ints.between 0 256;
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

    systemd.mounts = lib.mkIf cfg.mount-bundle [
      {
        enable = true;
        description = "Bind mount firecracker bundle";
        what = "${cfg.firecracker-bundle}";
        where = "/var/lib/cracked-judge/deps";
        type = "none";
        options = "bind,ro";
        unitConfig = {
          DefaultDependencies = "no";
        };
        wantedBy = [ "firecracker-pool.target" ];
      }
    ];

    systemd.services."firecracker-vm@" = {
      description = "Firecracker VM %i";
      after =
        if cfg.mount-bundle then
          [
            "network.target"
            "var-lib-cracked\\x2djudge-deps.mount"
          ]
        else
          [ "network.target" ];
      requires = lib.mkIf cfg.mount-bundle [ "var-lib-cracked\\x2djudge-deps.mount" ];

      serviceConfig = {
        Type = "simple";
        ExecStart = "${firecracker-vm-mgr}/bin/firecracker-vm-mgr start %i";
        ExecStop = "${firecracker-vm-mgr}/bin/firecracker-vm-mgr stop %i";
        Restart = "on-failure";
        TimeoutStopSec = "30s";
      };
    };

    systemd.targets."firecracker-pool" = {
      description = "All Firecracker VMs";
      wantedBy = [ "multi-user.target" ];
      wants = builtins.genList (i: "firecracker-vm@${toString i}.service") cfg.num-workers;
      after = builtins.genList (i: "firecracker-vm@${toString i}.service") cfg.num-workers;
    };
  };
}
