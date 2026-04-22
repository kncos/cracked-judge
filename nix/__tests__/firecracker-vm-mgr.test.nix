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

    networking = {
      useDHCP = false;
    };

    boot.supportedFilesystems = {
      xfs = true;
    };
  };

  testScript = ''
    import time
    machine.wait_for_unit("multi-user.target")

    def wait_for_ping(ip, timeout=45):
      start_time = time.time()
      print(f"waiting for {ip} to respond")

      while time.time() - start_time < timeout:
        (status, _) = machine.execute(f"ping {ip} -c 1 -W 1")
        if (status == 0):
          print(f"Ping succeeded for firecracker VM with {ip}")
          print(f"Time elapsed: {time.time() - start_time}")
          return True

        time.sleep(0.5)

      raise AssertionError((
        f"No ping for firecracker VM with {ip}\n"
        f"Time elapsed: {timeout}"
      ))

    wait_for_ping("10.0.0.2", 45)
    print("Tests succeeded")
  '';
}
