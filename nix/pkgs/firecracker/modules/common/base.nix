{ pkgs, lib, ... }:
{
  #* note: simplified this significantly, we'll see if it still works
  boot = {
    # loader.grub.enable = false;
    kernel = {
      # enable = false;
      sysctl = {
        "kernel.randomize_va_space" = 0;
        "kernel.core_pattern" = "/tmp/core.%e.%p";
        "fs.suid_dumpable" = 0;
      };
    };
  };

  environment = {
    # note: coreutils omitted, might be redundant here
    systemPackages = with pkgs; [
      fastfetch
      bash
      gcc15
      python314
      vim
      file
      htop
      bun
      socat
    ];
  };

  fileSystems = {
    "/" = {
      device = "/dev/vda";
      fsType = "ext4";
      options = [
        "rw"
        "relatime"
      ];
    };
    # static data mountpoint assuming the
    "/srv/data" = {
      device = "/dev/vdb";
      fsType = "ext4";
      options = [
        "nofail"
        "noauto"
        "ro"
        "noload"
      ];
    };
  };

  # firecracker only needs a single loopback w/ ipv4 so that
  # localhost works; all localhost traffic is bound to a socket using
  # socat, which is how it speaks to the outside world. The host
  # is the listener which decides how to interpret that traffic
  networking = {
    enableIPv6 = false;
    useDHCP = false;
    interfaces = lib.mkForce { };
    hostName = "judge";
  };

  systemd = {
    services = {
      # Networking stuff: none of this is needed because we only need loopback
      network-setup.enable = false;
      NetworkManager.enable = false;
      firewall.enable = false;
      resolvconf.enable = false;

      # other unnecessary stuff, not needed
      systemd-udevd.enable = false;
      systemd-timesyncd.enable = false;
      systemd-journald-audit.enable = false;
      systemd-udev-trigger.enable = false;
      "serial-getty@ttyS0" = {
        enable = true;
        wantedBy = [ "multi-user.target" ];
      };
      # still running these, removing modprobe services can shave
      # off 200ms+, figure out how to actually disable this
      "modprobe@.service" = {
        enable = false;
        wantedBy = lib.mkForce [ ];
      };
    };

    targets = {
      hibernate.enable = false;
      hybrid-sleep.enable = false;
      sleep.enable = false;
      suspend.enable = false;
    };
    defaultUnit = "multi-user.target";
    network = {
      wait-online.enable = false;
    };
    # this interferes with ioi/isolate and how it handles coredumps
    coredump.enable = false;
  };

  users = {
    users = {
      root = {
        password = "";
      };
    };
  };
}
