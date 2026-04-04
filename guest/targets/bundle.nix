{
  pkgs,
  lib,
  config,
}:
let
  rootfsImage = import ../firecracker/disk-image.nix { inherit pkgs lib config; };
  vmConfig = import ../firecracker/vm-config.nix { inherit pkgs lib config; };
  kernel = import ../firecracker/kernel.nix { inherit pkgs lib config; };
in
pkgs.symlinkJoin {
  name = "firecrackerBundle";
  paths = [
    rootfsImage
    vmConfig
    kernel
  ];
}
