{ pkgs, ... }:
let
  cj-guest-test = pkgs.callPackage ../../../cj-guest-test.nix { };
  isolate-test-program = pkgs.callPackage ../../../isolate-test-program.nix { };
in
{
  imports = [
    ../common
  ];

  config = {
    isolate.enable = true;
    environment.systemPackages = [
      cj-guest-test
      isolate-test-program
    ];
  };
}
