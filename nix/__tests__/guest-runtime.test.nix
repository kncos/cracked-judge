{ pkgs, lib, ... }:
pkgs.testers.nixosTest {
  name = "guest-runtime-tests";

  nodes.machine = {
    imports = [
      ../modules/guest-test-runtime.nix
      ./base-config.nix
    ];

    guest-test-runtime.enable = true;
    networking.useDHCP = false;
    virtualisation.cores = 8;
    virtualisation.memorySize = 12288;
  };

  testScript = ''
    machine.wait_for_unit("multi-user.target")
    machine.succeed("cj-guest-test")
  '';
}
