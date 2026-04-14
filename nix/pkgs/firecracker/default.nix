{
  pkgs,
  nixosSystem,
}:
let
  rootfs = pkgs.callPackage ./rootfs.nix { inherit nixosSystem; };

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
