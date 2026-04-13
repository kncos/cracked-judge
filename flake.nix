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

      packages.${system} = {
        default = import ./nix/pkgs/firecracker-host-bundle.nix {
          inherit pkgs nixpkgs system;
        };

        firecracker = pkgs.pkgsStatic.firecracker;

        firecracker-debug-bundle = pkgs.callPackage ./nix/pkgs/firecracker {
          inherit system nixpkgs;
          isDebug = true;
        };
      };
    };
}
