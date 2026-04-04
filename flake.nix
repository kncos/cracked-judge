{
  description = "";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
    in
    {
      packages.${system}.default = pkgs.writeShellApplication {
        name = "build-typescript-programs";
        runtimeInputs = with pkgs; [
          firecracker
          bun
        ];
        text = ''
          bun run build
        '';
      };
    };
}
