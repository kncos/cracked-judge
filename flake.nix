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

      nixosConfigurations = {
        firecracker = nixpkgs.lib.nixosSystem {
          inherit system;
          modules = [
            {
              guest-runtime.enable = true;
              nixpkgs.overlays = overlays;
            }
            ./nix/modules/firecracker-system.nix
            ./nix/modules/guest-runtime.nix
          ];
        };

        firecracker-debug = nixpkgs.lib.nixosSystem {
          inherit system;
          modules = [
            {
              guest-test-runtime.enable = true;
              nixpkgs.overlays = overlays;
              boot.kernelParams = [ "loglevel=3" ];
            }
            ./nix/modules/firecracker-system.nix
            ./nix/modules/guest-test-runtime.nix
          ];
        };
      };

      packages.${system} = {
        default = import ./nix/pkgs/firecracker-host-bundle.nix {
          inherit pkgs nixpkgs system;
        };

        firecracker = pkgs.callPackage ./nix/pkgs/firecracker {
          nixosSystem = self.nixosConfigurations.firecracker;
        };

        firecracker-debug = pkgs.callPackage ./nix/pkgs/firecracker {
          nixosSystem = self.nixosConfigurations.firecracker-debug;
        };

        guest = pkgs.callPackage ./nix/pkgs/cj-guest.nix { };
        guest-test = pkgs.callPackage ./nix/pkgs/cj-guest-test.nix { };

        isolate-test-program = pkgs.pkgsStatic.callPackage ./nix/pkgs/isolate-test-program.nix { };
      };

      checks.${system} = {
        guest-runtime = pkgs.callPackage ./nix/__tests__/guest-runtime.test.nix { };
      };
    };
}
