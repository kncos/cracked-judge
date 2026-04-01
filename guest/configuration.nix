{ pkgs, ... }:
{
  networking.hostName = "guest";
  users.users.root = {
    password = "";
  };

  environment.systemPackages = with pkgs; [
    fastfetch
    isolate
    coreutils
    bash
    gcc15
    python314
    vim
    file
    htop
  ];

  environment.etc."isolate.conf" = {
    text = ''
      # NOTE: this file sets up the cgroup for isolate for this firecracker
      # instance -- cg_root is specified here as /sys/fs/cgroup/isolate, and
      # this needs +cpuset +memory to be supplied to the cgroup.subgroup_control
      # in both the system root cgroup and isolate cg_root cgroup

      # This is a configuration file for Isolate

      # All sandboxes are created under this directory.
      # To avoid symlink attacks, this directory and all its ancestors
      # must be writeable only to root.
      box_root = /var/local/lib/isolate

      # Directory where lock files are created.
      lock_root = /run/isolate/locks

      # Control group under which we place our subgroups
      # Either an explicit path to a subdirectory in cgroupfs, or "auto:file" to read
      # the path from "file", where it is put by isolate-cg-helper.
      # cg_root = /sys/fs/cgroup/isolate.slice/isolate.service
      cg_root = /sys/fs/cgroup/isolate

      # Block of UIDs and GIDs reserved for sandboxes
      first_uid = 60000
      first_gid = 60000
      num_boxes = 1000

      # Only root can create new sandboxes (default: 0=everybody can)
      #restricted_init = 1

      # Per-box settings of the set of allowed CPUs and NUMA nodes
      # (see linux/Documentation/cgroups/cpusets.txt for precise syntax)

      #box0.cpus = 0
      #box0.mems = 1
    '';
    mode = "0644";
  };

  environment.variables = {
    EDITOR = "vim";
    ISOLATE_CONFIG_FILE = "/etc/isolate.conf";
    COLUMNS = "160";
    ROWS = "40";
  };

  systemd.coredump.enable = false;
  boot.kernel.sysctl = {
    "kernel.randomize_va_space" = 0;
    "kernel.core_pattern" = "/tmp/core.%e.%p";
    "fs.suid_dumpable" = 0;
  };

  systemd.services.isolate-setup = {
    description = "Setup cgroups and environment for isolate";
    wantedBy = [ "multi-user.target" ];
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
    };
    path = [ "/run/current-system/sw" ];

    # retrieved from old RCS
    script = ''
      # cgroup setup for isolate
      echo "+cpuset +memory" > /sys/fs/cgroup/cgroup.subtree_control
      mkdir -p /sys/fs/cgroup/isolate
      echo "+cpuset +memory" > /sys/fs/cgroup/isolate/cgroup.subtree_control
      mkdir -p /run/isolate/locks

      # check environment
      echo ">>> FIRECRACKER PRE-FIX ISSUES:"
      ${pkgs.isolate}/bin/isolate-check-environment -e || true
      echo ">>> FIRECRACKER POST-FIX ISSUES:"
      if ! ${pkgs.isolate}/bin/isolate-check-environment; then
        echo "NOTE: isolate-check-environment returned non-zero value: $?";
        echo "NOTE: this could be because the script cannot detect if the CPU"
        echo "      has both P & E cores, in which case this can be ignored."
      fi
    '';

    after = [
      "systemd-cgroupv2-setup.service"
      "systemd-sysctl.service"
      "local-fs.target"
    ];
    requires = [
      "systemd-sysctl.service"
    ];
  };

  # systemd.enableUnifiedCgroupHierarchy = true;

  system.build.image = (pkgs.callPackage (pkgs.path + "/nixos/lib/make-disk-image.nix")) {
    # import the config from within the module system via a separate callPackage in bundle.nix instead
  };

  # ?
  system.stateVersion = "26.05";
}
