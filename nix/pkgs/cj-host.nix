{ pkgs }:
pkgs.bun2nix.mkDerivation {
  pname = "cj-server";
  src = ../../cracked-judge;
  version = "v1.0.0";
  bunDeps = pkgs.bun2nix.fetchBunDeps {
    bunNix = ../bun.nix;
  };
  module = "./apps/server/src/index.ts";
}
