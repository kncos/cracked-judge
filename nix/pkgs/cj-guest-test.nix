{ pkgs }:
pkgs.bun2nix.writeBunApplication {
  pname = "cj-guest-test";
  version = "1.0.0";

  src = ./.;

  # note: we'll have to specify a subdir eventually
  # by either putting it here or at src above or by
  # just separating the host/guest runtimes more cleanly
  startScript = ''
    bun test
  '';

  bunDeps = pkgs.bun2nix.fetchDeps {
    bunNix = ../bun.nix;
  };
}
