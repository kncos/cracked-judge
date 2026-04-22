{
  pkgs,
  ...
}:
pkgs.writeShellApplication {
  name = "firecracker-vm-mgr";

  runtimeInputs = with pkgs; [
    # chown, mkdir, touch, ...
    coreutils
    # mount, umount
    util-linux
    # ip addr, ip link ...
    iproute2
    iptables
    curl
    which
    # firecracker, jailer
    firecracker
  ];

  text = builtins.readFile ../../vm-host-scripts/fc-pool.sh;
}
