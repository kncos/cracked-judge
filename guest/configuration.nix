{ pkgs, ... }:
{
  networking.hostName = "guest";
  users.users.root.password = "";

  boot.loader.grub.enable = false;

  environment.systemPackages = with pkgs; [
    fastfetch
    isolate
    coreutils
    bash
    gcc15
    python314
    vim
  ];

  systemd.services.isolate-setup = {
    description = "Setup cgroups and environment for isolate";
    wantedBy = [ "multi-user.target" ];
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
    };

    # retrieved from old RCS
    script = ''
      # cgroup setup for isolate
      echo "+cpuset +memory" > /sys/fs/cgroup/cgroup.subtree_control
      mkdir -p /sys/fs/cgroup/isolate
      echo "+cpuset +memory" > /sys/fs/cgroup/isolate/cgroup.subtree_control
      mkdir -p /run/isolate/locks

      # check environment
      ${pkgs.isolate}/bin/isolate-check-environment -e || true
      if ! ${pkgs.isolate}/bin/isolate-check-environment; then
        echo "ISOLATE ENVIRONMENT FAILED CHECK"
        exit 1
      else
        echo "ISOLATE ENVIRONMENT PASSES CHECK"
      fi
    '';

    after = [
      "systemd-cgroupv2-setup.service"
      "local-fs.target"
    ];
  };

  systemd.enableUnifiedCgroupHierarchy = true;

  # ?
  system.stateVersion = "26.05";
}
