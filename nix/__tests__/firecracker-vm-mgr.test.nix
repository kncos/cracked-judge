{
  pkgs,
  lib,
  firecracker-bundle,
  ...
}:
pkgs.testers.nixosTest {
  name = "firecracker-vm-mgr-tests";

  nodes.machine = {
    imports = [
      ../modules/firecracker-vm-mgr.nix
    ];

    # firecracker-vm-mgr
    firecracker-vm-mgr = {
      inherit firecracker-bundle;
      enable = true;
      num-workers = 1;
    };

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
  '';
}
