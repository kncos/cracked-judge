{ pkgs, lib, ... }:
{
  imports = [
    ../common
    ./guest-runtime.nix
  ];

  config = {
    isolate.enable = true;
    guest-runtime.enable = true;
  }
  #* disabled for now because i want to see if it works without
  // lib.mkIf false {
    isolate.enable = true;
    guest-runtime.enable = true;

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
  };
}
