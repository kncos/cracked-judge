{ pkgs }:
pkgs.bun2nix.mkDerivation {
  src = ../../apps/guest;
  pname = "cj-guest";
  version = "0.1";
  # module = "src/guest/index.ts";

  bunDeps = pkgs.bun2nix.fetchBunDeps {
    bunNix = ../bun.nix;
  };
}
