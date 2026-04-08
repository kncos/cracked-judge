{
  pkgs,
  lib,
  config,
  ...
}:
let
  cfg = config.firecracker.host-config;
in
{
  options.firecracker.host-config = {
    enable = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Whether or not to generate host-config.json for the host";
    };

    package = lib.mkOption {
      type = lib.types.package;
      readOnly = true;
      description = "Derivation result for host-config";
    };
  };

  config.firecracker.host-config = lib.mkIf cfg.enable {
    package = pkgs.writeText "host-config.json" builtins.toJSON {

    };
  };
}
