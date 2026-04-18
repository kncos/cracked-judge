{ pkgs, lib, ... }:
pkgs.testers.nixosTest {
  name = "guest-runtime-tests";

  nodes.machine = {
    imports = [
      ../modules/guest-test-runtime.nix
    ];
    guest-test-runtime.enable = true;
    # requires this because we intentionally trigger oom to test isolate
    boot.kernel.sysctl."vm.panic_on_oom" = 0;
    boot.kernelParams = [
      "loglevel=3"
      "quiet"
      "udev.log_level=3"
      "rd.systemd.show_status=false"
    ];
    boot.consoleLogLevel = lib.mkForce 3;

  };

  testScript = ''
    machine.wait_for_unit("multi-user.target")
    machine.succeed("cj-guest-test")
  '';
}
