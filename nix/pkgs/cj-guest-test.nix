{ pkgs }:
pkgs.callPackage ./judge-app-test.nix { appName = "guest"; }

# pkgs.bun2nix.writeBunApplication {
#   src = ../../cracked-judge;
#   pname = "cj-guest-test";
#   bunDeps = pkgs.bun2nix.fetchBunDeps {
#     bunNix = ../bun.nix;
#   };
#
#   dontUseBunBuild = true;
#   dontUseBunCheck = true;
#
#   # note: we'll have to specify a subdir eventually
#   # by either putting it here or at src above or by
#   # just separating the host/guest runtimes more cleanly
#   startScript = ''
#     bun test ./apps/guest
#   '';
# }
#
