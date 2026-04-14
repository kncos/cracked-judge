{ pkgs, ... }:
pkgs.testers.nixosTest {
  name = "guest-runtime-tests";

  nodes.machine = {
    imports = [
      ../../modules/guest-test-runtime.nix
    ];
    guest-test-runtime.enable = true;
    # requires this because we intentionally trigger oom to test isolate
    boot.kernel.sysctl."vm.panic_on_oom" = 0;
  };

  testScript = ''
    machine.wait_for_unit("multi-user.target")
    (status, stdout) = machine.execute("cj-guest-test src/guest", True)
  '';
}
