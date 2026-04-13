{
  pkgs,
  nixpkgs,
  isDebug ? false,
  system ? "x86_64-linux",
}:
let
  makeDiskImage = import "${pkgs.path}/nixos/lib/make-disk-image.nix";

  nixosSystem = pkgs.callPackage ./nixos-system.nix { inherit nixpkgs isDebug system; };

  rootfs = makeDiskImage {
    inherit pkgs;
    lib = pkgs.lib;
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
  };

  vm-config = pkgs.callPackage ./vm-config.nix {
    kernelInitBin = "${nixosSystem.config.system.build.toplevel}/init";
  };

  vmlinux = pkgs.callPackage ./kernel.nix { arch = "x86_64"; };
in
pkgs.runCommand "firecracker-guest-bundle" { } ''
  mkdir -p $out
  cp "${vmlinux}" "$out/vmlinux"
  cp "${vm-config}" "$out/vm-config.json"
  cp "${rootfs}/nixos.img" "$out/rootfs.ext4"
''
