{
  description = "CrackedJudge - RCE as a Service";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";

    bun2nix.url = "github:nix-community/bun2nix";
    bun2nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  nixConfig = {
    extra-substituters = [
      "https://cache.nixos.org"
      "https://nix-community.cachix.org"
    ];
    extra-trusted-public-keys = [
      "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY="
      "nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs="
    ];
  };

  outputs =
    {
      self,
      nixpkgs,
      ...
    }:
    let
      system = "x86_64-linux";
      # see: https://nix-community.github.io/bun2nix/overlay.html
      # adds bun2nix binary to pkgs
      overlays = import ./nix/overlays.nix { inherit self; };
      pkgs = import nixpkgs {
        inherit system overlays;
      };
    in
    {

      nixosConfigurations.firecracker = nixpkgs.lib.nixosSystem {
        inherit system;
        modules = [
          {
            nixpkgs.overlays = overlays;
            firecracker.all.enable = true;
            firecracker.vm-config.rootfsPath = "rootfs.ext4";
            firecracker.vm-config.kernelPath = "vmlinux";
            firecracker.vm-config.socketPath = "/run/v.sock";
          }
          ./nix/firecracker
        ];
      };

      packages.${system} =
        let
          fc = self.nixosConfigurations.firecracker;
        in
        {

          firecracker = fc.config.firecracker.all.package;
          host = pkgs.bun2nix.mkDerivation {
            src = ./.;
            pname = "crackedjudge-host";
            version = "0.1";

            bunDeps = pkgs.bun2nix.fetchBunDeps {
              bunNix = ./bun.nix;
            };

            module = "src/host.ts";
          };
        };

    };
}
