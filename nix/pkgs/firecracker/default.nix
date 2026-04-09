{
  pkgs,
  nixpkgs,
  system ? "x86_64-linux",
}:
let
  nixSystem = import ./system.nix {
    inherit nixpkgs system;
  };

  rootfs = import ./rootfs.nix {
    inherit pkgs;
    nixosConfig = nixSystem.config;
  };

  vm-config = import ./vm-config.nix {
    inherit pkgs;
    kernelInitBin = "${nixSystem.config.system.build.toplevel}/init";
  };

  vmlinux = import ./kernel.nix {
    inherit pkgs;
  };
in
pkgs.runCommand "firecracker-guest-bundle" { } ''
  mkdir -p $out
  cp "${vmlinux}" "$out/vmlinux"
  cp "${vm-config}" "$out/vm-config.json"
  cp "${rootfs}/nixos.img" "$out/rootfs.ext4"
''
