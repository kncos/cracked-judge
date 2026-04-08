{
  pkgs,
  lib,
  nixosConfig,
  diskSize ? "auto",
  additionalSpace ? "512M",
}:
let
  makeDiskImage = import "${pkgs.path}/nixos/lib/make-disk-image.nix";
in
# see: https://ryantm.github.io/nixpkgs/builders/images/makediskimage/
# see: https://ryantm.github.io/nixpkgs/builders/images/makediskimage/
makeDiskImage {
  inherit pkgs lib;
  config = nixosConfig;
  inherit diskSize additionalSpace;

  additionalPaths = [ ];
  format = "raw";
  onlyNixStore = false;
  partitionTableType = "none";
  installBootLoader = false;
  touchEFIVars = false;
  fsType = "ext4";
}
