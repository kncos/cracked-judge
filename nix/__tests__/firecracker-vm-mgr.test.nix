{
  pkgs,
  firecracker-bundle,
  ...
}:
let
  vmroot-block-dev = pkgs.callPackage ../pkgs/vmroot-block-dev.nix { inherit firecracker-bundle; };
in
pkgs.testers.nixosTest {
  name = "firecracker-vm-mgr-tests";

  nodes = {
    basic_network = {
      imports = [ ./base-vm-host-config.nix ];
      vmroot-block-dev.package = vmroot-block-dev;
      firecracker-vm-mgr = {
        enable = true;
        num-workers = 1;
      };
    };

    multi_network = {
      imports = [ ./base-vm-host-config.nix ];
      vmroot-block-dev.package = vmroot-block-dev;
      firecracker-vm-mgr = {
        enable = true;
        num-workers = 4;
      };
    };
  };

  testScript = ''
    import time
    from concurrent.futures import ThreadPoolExecutor, as_completed

    def wait_for_workers(machine, ips, timeout=45):
      """
      Wait for all worker VMs to come online, then test iperf3 traffic
      in both directions for each. Polls all IPs concurrently.
      Raises AssertionError if any worker fails to come online or
      if any iperf3 test fails.
      """
      start_time = time.time()
      remaining = set(ips)

      print(f"[{machine.name}] waiting for workers: {ips}")

      while remaining:
        elapsed = time.time() - start_time
        if elapsed >= timeout:
          raise AssertionError(
            f"[{machine.name}] timed out after {timeout}s waiting for workers: {sorted(remaining)}"
          )

        def ping(ip):
          status, _ = machine.execute(f"ping {ip} -c 1 -W 1")
          return ip, status == 0

        with ThreadPoolExecutor() as executor:
          futures = {executor.submit(ping, ip): ip for ip in remaining}
          for future in as_completed(futures):
            ip, ok = future.result()
            if ok:
              print(f"[{machine.name}] worker {ip} is up (elapsed: {time.time() - start_time:.1f}s)")
              remaining.discard(ip)

        if remaining:
          time.sleep(0.5)

      print(f"[{machine.name}] all workers online, running iperf3")

      failed = []
      for ip in ips:
        for direction, flag in [("upload", ""), ("download", "-R")]:
          cmd = f"iperf3 -c {ip} -t 1 {flag}".strip()
          status, out = machine.execute(cmd)
          if status != 0:
            failed.append((ip, direction, out))
          else:
            print(f"[{machine.name}] iperf3 {direction} to {ip} OK")

      if failed:
        details = "\n".join(
          f"  {ip} {direction}: {out}" for ip, direction, out in failed
        )
        raise AssertionError(f"[{machine.name}] iperf3 failures:\n{details}")

    basic_network.wait_for_unit("multi-user.target")
    multi_network.wait_for_unit("multi-user.target")

    wait_for_workers(basic_network, ["10.0.0.2"])
    wait_for_workers(multi_network, [f"10.0.{i}.2" for i in range(4)])
  '';
}
