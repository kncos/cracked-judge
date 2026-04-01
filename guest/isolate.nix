{
  pkgs,
  ...
}:
{
  nixpkgs.overlays = [ (final: prev: {
    isolate = prev.isolate.overrideAttrs (oldAttrs: {
      version = "2.2.1";
      src = prev.fetchFromGitHub {
        owner = "ioi";
        repo = "isolate";
        rev = "v2.2.1";
        hash = "sha256-haH4fjL3cWayYrpUDwD4hUNlxIoN6MdO3QgAqimi/+c=";
      };
    });
  }) ];

  security.isolate = {
    enable = true;
  };

  systemd.services.isolate-setup = {
    description = "Setup cgroups and environment for isolate";
    wantedBy = [ "multi-user.target" ];
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
    };
    path = [ "/run/current-system/sw" ];

    #* NOTE: Removed this from the script, i think the isolate module handles cgroups
    # # cgroup setup for isolate
    # echo "+cpuset +memory" > /sys/fs/cgroup/cgroup.subtree_control
    # mkdir -p /sys/fs/cgroup/isolate
    # echo "+cpuset +memory" > /sys/fs/cgroup/isolate/cgroup.subtree_control
    # mkdir -p /run/isolate/locks

    # retrieved from old RCS
    script = ''
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
}
