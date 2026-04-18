{ pkgs, appName, ... }:
let
  ts-root = ../../cracked-judge;
in
pkgs.bun2nix.mkDerivation {
  pname = "cj-${appName}";
  src = ts-root;
  version = "v1.0.0";
  # packageJson = "${ts-root}/apps/${appName}/package.json";
  bunDeps = pkgs.bun2nix.fetchBunDeps {
    bunNix = ../bun.nix;
  };

  module = "apps/${appName}/src/index.ts";
}
