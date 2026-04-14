{
  pkgs,
  lib,
  nixosSystem,
}:
let
  make-disk-image = import <nixpkgs/nixos/lib/make-disk-image.nix>;
in
make-disk-image {
  inherit pkgs lib;
  config = nixosSystem.config;

  diskSize = "auto";
  additionalSpace = "512M";
  additionalPaths = [ ];
  format = "raw";
  onlyNixStore = false;
  partitionTableType = "none";
  installBootLoader = false;
  touchEFIVars = false;
  fsType = "ext4";
}
