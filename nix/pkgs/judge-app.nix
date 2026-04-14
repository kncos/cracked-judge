{ pkgs, appName, ... }:
pkgs.bun2nix.mkDerivation rec {
  pname = "cj-${appName}";
  src = ../../cracked-judge;
  packageJson = src + "/app/${appName}/package.json";
  bunDeps = pkgs.bun2nix.fetchBunDeps {
    bunNix = ../bun.nix;
  };

  module = "./apps/${appName}/src/index.ts";
}
