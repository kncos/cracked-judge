{ pkgs, lib, ... }:
{
  #TODO: re-evaluate whether mkForce is needed

  boot = {
    loader.grub.enable = false;
    kernel = {
      enable = false;
      # is this redundant?
      sysctl = {
        "kernel.randomize_va_space" = 0;
        "kernel.core_pattern" = "/tmp/core.%e.%p";
        "fs.suid_dumpable" = 0;
      };
    };
    initrd = {
      # don't need initrd for firecracker
      enable = false;
      # these were the options we had before, if we do make the
      # initrd it just runs NixOS stage 1 script, which performs
      # some actions that ultimately do nothing in the context of firecracker
      systemd.enable = lib.mkForce false;
      includeDefaultModules = lib.mkForce false;
      availableKernelModules = lib.mkForce [ ];
      kernelModules = lib.mkForce [ ];
    };
    # firecracker kernel has no modules
    kernelModules = lib.mkForce [ ];
    extraModulePackages = lib.mkForce [ ];
    # This *may* not even be necessary, it depends on if this is used to build
    # the initrd, but we have kernel.enable = false already and aren't building
    # an initr
    kernelPackages = pkgs.linuxPackages;
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
    ];
  };

  # TODO: re-evaluate if we can remove this entirely since firecracker config specifies this
  fileSystems = {
    "/" = {
      device = "/dev/vda";
      fsType = "ext4";
      options = [
        "rw"
        "relatime"
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
        mask = true;
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
