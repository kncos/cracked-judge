{
  pkgs,
  lib,
  config,
  ...
}:
let
  cfg = config.guest-runtime;
  cj-guest = import ../../../cj-guest.nix { inherit pkgs; };
in
{
  options.guest-runtime = {
    enable = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Installs firecracker worker runtime + associated services";
    };
  };

  config = lib.mkIf cfg.enable {
    environment.systemPackages = [
      cj-guest
    ];

    systemd.services.mount-data-disk = {
      description = "temporary service i added for testing";
      script = ''
        # isolate just fails without this even though its unused
        mkdir /lib
        mkdir -p /srv/data
        if [ -e /dev/vdb ]; then
          mount /dev/vdb /srv/data
        fi
      '';
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
      };
      wantedBy = [ "multi-user.target" ];
    };

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
