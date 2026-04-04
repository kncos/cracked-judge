{
  description = "";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    guest-flake.url = "path:./guest";
  };

  outputs =
    {
      self,
      nixpkgs,
      guest-flake,
    }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
      deps = with pkgs; [
        firecracker
        bun
      ];
      guestCfg = guest-flake.nixosConfigurations.firecracker.config;
    in
    {
      packages.${system} = {

      };

      devShells.${system}.default = pkgs.mkShell {
        packages = deps;
      };
    };
}
