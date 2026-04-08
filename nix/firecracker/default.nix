{
  pkgs,
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
    ./disk-image.nix
    ./kernel.nix
    ./vm-config.nix
    ./worker-runtime.nix
  ];

  options.firecracker.all = {
    enable = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Enable all firecracker targets and produce a firecracker bundle derivation";
    };
    package = lib.mkOption {
      type = lib.types.package;
      readOnly = true;
      description = "single directory containing all firecracker derivation results";
    };
  };

  config = lib.mkIf cfg.enable {
    firecracker.disk-image.enable = true;
    isolate.enable = true;
    firecracker.kernel.enable = true;
    firecracker.vm-config.enable = true;
    firecracker.worker-runtime.enable = true;

    firecracker.all.package =
      let
        kernel = config.firecracker.kernel.package;
        vmcfg = config.firecracker.vm-config.package;
        rootfs = config.firecracker.disk-image.package;
      in
      pkgs.runCommand "firecracker-bundle" { } ''
        mkdir -p $out
        cp "${kernel}" $out/vmlinux
        cp "${vmcfg}" $out/vm-config.json
        cp "${rootfs}/nixos.img" $out/rootfs.ext4
      '';
  };
}
