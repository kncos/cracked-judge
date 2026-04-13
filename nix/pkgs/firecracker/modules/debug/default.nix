{ pkgs, ... }:
let
  cj-guest-test = pkgs.callPackage ../../../cj-guest-test.nix { };
in
{
  imports = [
    ../common
  ];

  config = {
    isolate.enable = true;
    environment.systemPackages = [
      cj-guest-test
    ];
  };
}
