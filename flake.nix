{
  description = "Judge for running untrusted user submitted-code with firecracker";
  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";

  bun2nix.url = "github:nix-community/bun2nix";
  bun2nix.inputs.nixpkgs.follows = "nixpkgs";

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
    { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      devShells.default = pkgs.mkShell {
        packages = with pkgs; [
          bun
          bun2nix.packages.${system}.default
        ];
      };
    };
}
