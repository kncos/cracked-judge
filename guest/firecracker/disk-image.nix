{
  pkgs,
  lib,
  # config,
  system ? "x86_64-linux",
  modules ? [ ],
  ...
}:
let
  make-disk-image = import "${pkgs.path}/nixos/lib/make-disk-image.nix";
  vmSystem = lib.nixosSystem {
    inherit system;
    modules = [
      { nixpkgs.hostPlatform = system; }
      # firecracker nixosSystem options (contains all)
      ./firecracker.nix
      # isolate options (sets up services, ensures package is installed)
      ./isolate.nix
    ]
    ++ modules;
  };
  config = vmSystem.config;
in
# see: https://ryantm.github.io/nixpkgs/builders/images/makediskimage/
# see: https://ryantm.github.io/nixpkgs/builders/images/makediskimage/
make-disk-image {
  # inherit the system setup. config is the nixos configuration to be
  # installed onto the disk image
  inherit pkgs lib config;

  additionalPaths = [ ];
  # can be raw or qcow2, for firecracker we don't use qcow2
  format = "raw";
  # nix-store only image, defaults to false
  onlyNixStore = false;

  # only rootfs.ext4 for firecracker
  partitionTableType = "none";
  # firecracker is the bootloader
  installBootLoader = false;
  touchEFIVars = false;

  # Disk size — adjust as needed. "auto" tries to calculate it.
  diskSize = "auto";
  # additional space to be added when 'auto' is used for diskSize
  additionalSpace = "512M";

  # root fs type, ext4 for firecracker
  fsType = "ext4";
}
