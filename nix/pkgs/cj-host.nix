{ pkgs }:
pkgs.bun2nix.mkDerivation {
  src = ../../.;
  pname = "cj-host";
  version = "0.1";
  module = "src/host.ts";

  bunDeps = pkgs.bun2nix.fetchBunDeps {
    bunNix = ../bun.nix;
  };
}
