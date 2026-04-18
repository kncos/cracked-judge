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
    environment.systemPackages = with pkgs; [
      bash
      gcc15
      python314
      file
      bun
      socat
      file
      zip
      unzip
      tree
      (pkgs.callPackage ../pkgs/cj-guest-test.nix { })
      (pkgs.callPackage ../pkgs/isolate-test-program.nix { })
    ];
  };
}
