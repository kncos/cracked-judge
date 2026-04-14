{
  pkgs,
  lib,
  config,
  ...
}:
let
  cfg = config.guest-test-runtime;
in
{
  options.guest-test-runtime = {
    enable = lib.mkEnableOption ''
      Installs the cj-guest-test binary and associated dependencies.
      - installs isolate-test-program and isolate
      - enables isolate systemd services such as isolate-setup and isolate-cg-keeper
    '';
  };

  # depends on isolate
  imports = [
    ./isolate.nix
  ];

  config = lib.mkIf cfg.enable {
    isolate.enable = true;
    environment.systemPackages = [
      (pkgs.callPackage ../pkgs/cj-guest-test.nix { })
      (pkgs.callPackage ../pkgs/isolate-test-program.nix { })
    ];
  };
}
