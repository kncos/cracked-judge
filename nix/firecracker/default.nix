{
  lib,
  config,
  ...
}:
let
  cfg = config.firecracker.all;
in
{
  imports = [
    ./system.nix
    ./isolate.nix
    ./worker-runtime.nix
  ];

  options.firecracker.all = {
    enable = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Enable all firecracker targets and produce a firecracker bundle derivation";
    };
  };

  config = lib.mkIf cfg.enable {
    # here, we just enable both isolate and the runtime,
    # which is the default scenario that we want
    isolate.enable = true;
    firecracker.worker-runtime.enable = true;
  };
}
