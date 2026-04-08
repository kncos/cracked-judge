{
  pkgs,
  lib,
  config,
  ...
}:
let
  cfg = config.firecracker.worker-runtime;
in
{
  options.firecracker.worker-runtime = {
    enable = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Installs firecracker worker runtime + associated services";
    };

    package = lib.mkOption {
      type = lib.types.nullOr lib.types.package;
      readOnly = true;
      default = null;
      description = "Derivation for worker runtime binary";
    };
  };

  config = lib.mkIf cfg.enable {
    firecracker.worker-runtime = {
      package = pkgs.bun2nix {
        pname = "worker-runtime";
        version = "0.1";

        src = ./.;

        module = "src/guest/index.ts";

        bunDeps = pkgs.bun2nix.fetchBunDeps {
          bunNix = ../../bun.nix;
        };
      };
    };

    environment.systemPackages = [
      cfg.package
    ];

    systemd.services.worker-runtime = {
      description = "Spawn worker runtime process";
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        ExecStart = "${cfg.package}/bin/worker-runtime";
        Restart = "always";
        RestartSec = "1s";
      };
      path = [ "/run/current-system/sw" ];
      after = [
        "worker-socket-bridge.service"
      ];
    };

    systemd.services.worker-socket-bridge = {
      description = "bridges worker-runtime network traffic to the vm socket";
      wantedBy = [ "multi-user.target" ];
      path = [ "/run/current-system/sw" ];
      serviceConfig = {
        ExecStart = "${pkgs.socat}/bin/socat TCP-LISTEN:3000,fork,reuseaddr VSOCK-CONNECT:2:52";
        Restart = "always";
        RestartSec = "1s";
      };
    };
  };
}
