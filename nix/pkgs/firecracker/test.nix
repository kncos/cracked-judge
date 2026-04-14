{ pkgs, lib, ... }:
let

in
pkgs.testers.nixosTest {
  name = "judge-runtime";

  nodes.machine = {
    imports = [
      ../../modules/guest-test-runtime.nix
      ../../modules/firecracker-system.nix
    ];
    guest-test-runtime.enable = true;
  };

  testScript = ''
    machine.wait_for_unit("multi-user.target")
    (status, stdout) = machine.execute("cj-guest-test src/guest", True)
  '';
}
