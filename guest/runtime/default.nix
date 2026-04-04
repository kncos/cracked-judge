{
  pkgs,
  lib,
  config,
  ...
}:
let
  cfg = config.worker-runtime;
  guestPath = ./guest.js;
in
{

  options.worker-runtime = {
    enable = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = ''
        whether or not to include the worker runtime in the resulting system
        and the associated systemd service that launches it
      '';
    };
  };

  config = lib.mkIf cfg.enable {
    environment.etc."guest.js".source =
      if builtins.pathExists guestPath then
        guestPath
      else
        throw ''
          ERROR: The file '${toString guestPath}' does not exist.
          Did you forget to use `bun run build:guest` first?
        '';

    systemd.services.worker-runtime = {
      description = "Spawn worker runtime process";
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        Restart = "always";
        RestartSec = "1s";
      };
      path = [ "/run/current-system/sw" ];
      after = [
        "worker-socket-bridge.service"
      ];
      script = ''
        bun run /etc/guest.js 
      '';
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
