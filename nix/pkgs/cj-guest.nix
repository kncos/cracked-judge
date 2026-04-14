{ pkgs }:
pkgs.callPackage ./judge-app.nix { appName = "guest"; }
# pkgs.bun2nix.mkDerivation {
#   pname = "cj-guest";
#   src = ../../cracked-judge;
#   version = "v1.0.0";
#   bunDeps = pkgs.bun2nix.fetchBunDeps {
#     bunNix = ../bun.nix;
#   };
#
#   module = "./apps/guest/src/index.ts";
# }
#
