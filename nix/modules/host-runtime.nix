{
  pkgs,
  lib,
  config,
  ...
}:
let
  cj-host = pkgs.callPackage ../pkgs/cj-host.nix { };
  # todo: will expose options for this later on
  cj-host-config = pkgs.callPackage ../pkgs/host-config.nix { };
  firecracker-bins = pkgs.pkgsStatic.callPackage ../pkgs/firecracker-bins.nix { };
  cfg = config.host-runtime;
in
{
  options.host-runtime = {
    enable = lib.mkEnableOption "Enables cj-host runtime + associated services";
  };

  config = lib.mkIf cfg.enable {
    environment.systemPackages = [
      firecracker-bins
      cj-host
    ];

    systemd.services.cj-host-runtime = {
      description = "Spawn cj-guest worker runtime process";
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        ExecStart = "${cj-host}/bin/cj-host --config ${cj-host-config}";
        Restart = "always";
        RestartSec = "5s";
      };
      path = [ "/run/current-system/sw" ];
      after = [
        "guest-socket-bridge.service"
      ];
    };
  };
}
