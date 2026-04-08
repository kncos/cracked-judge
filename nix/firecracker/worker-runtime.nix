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
  };

  config = lib.mkIf cfg.enable {

    environment.systemPackages =
      let
        runtime = import ../pkgs/guest-runtime.nix { inherit pkgs; };
      in
      [
        runtime
      ];

    systemd.services.worker-runtime = {
      description = "Spawn cj-guest worker runtime process";
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        ExecStart = "cj-guest";
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
