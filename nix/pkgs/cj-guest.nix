{ pkgs }:
pkgs.bun2nix.mkDerivation {
  src = ../../.;
  pname = "cj-guest";
  version = "0.1";
  module = "./apps/guest/src/index.ts";

  bunDeps = pkgs.bun2nix.fetchBunDeps {
    bunNix = ../bun.nix;
  };
}
