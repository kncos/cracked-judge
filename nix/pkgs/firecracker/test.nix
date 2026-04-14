{ pkgs, lib, ... }:
let

in
pkgs.testers.nixosTest {
  name = "judge-runtime";

  nodes.machine = {
    imports = [ ./modules/common/isolate.nix ];
    isolate.enable = true;
    environment.systemPackages = [
      (pkgs.callPackage ../cj-guest-test.nix { })
      (pkgs.callPackage ../isolate-test-program.nix { })
    ];

    boot.kernel.sysctl = {
      # let oom killer handle it. Isolate tests trigger oom intentionally
      "vm.panic_on_oom" = 0;
    };
  };

  testScript = ''
    machine.wait_for_unit("multi-user.target")
    (status, stdout) = machine.execute("cj-guest-test src/guest", True)
  '';
}
