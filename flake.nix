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
      deps = with pkgs; [
        firecracker
        bun
      ];
    in
    {
      packages.${system}.default = pkgs.writeShellApplication {
        name = "build-typescript-programs";
        runtimeInputs = deps;
        text = ''
          bun run build
        '';
      };

      devShells.${system}.default = pkgs.mkShell {
        packages = deps;
      };
    };
}
