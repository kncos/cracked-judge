{
  pkgs,
  lib,
  config,
  ...
}:
let
  cfg = config.guest-runtime;
  cj-guest = pkgs.callPackage ../pkgs/cj-guest.nix { };
in
{
  # unconditionally requires isolate to operate
  imports = [ ./isolate.nix ];

  options.guest-runtime = {
    enable = lib.mkEnableOption "Installs firecracker worker runtime + associated services";
  };

  config = lib.mkIf cfg.enable {
    isolate.enable = true;

    environment.systemPackages = [
      cj-guest
    ];

    systemd.services.guest-runtime = {
      description = "Spawn cj-guest worker runtime process";
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        ExecStart = "${cj-guest}/bin/cj-guest";
        Restart = "always";
        RestartSec = "1s";
      };
      path = [ "/run/current-system/sw" ];
      after = [
        "guest-socket-bridge.service"
      ];
    };

    systemd.services.guest-socket-bridge = {
      description = "bridges guest runtime network traffic to the vm socket";
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
