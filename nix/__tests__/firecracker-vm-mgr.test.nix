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
      ./base-config.nix
      ../modules/firecracker-vm-mgr.nix
    ];

    # firecracker-vm-mgr
    firecracker-vm-mgr = {
      inherit firecracker-bundle;
      enable = true;
      num-workers = 1;
    };
  };

  testScript = ''
    machine.wait_for_unit("multi-user.target")
  '';
}
