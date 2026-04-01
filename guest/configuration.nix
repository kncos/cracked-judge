{ pkgs, ... }:
{
  networking.hostName = "guest";
  users.users.root = {
    password = "";
  };

  environment.systemPackages = with pkgs; [
    fastfetch
    coreutils
    bash
    gcc15
    python314
    vim
    file
    htop
  ];

  systemd.coredump.enable = false;
  boot.kernel.sysctl = {
    "kernel.randomize_va_space" = 0;
    "kernel.core_pattern" = "/tmp/core.%e.%p";
    "fs.suid_dumpable" = 0;
  };

  # systemd.enableUnifiedCgroupHierarchy = true;

  system.build.image = (pkgs.callPackage (pkgs.path + "/nixos/lib/make-disk-image.nix")) {
    # import the config from within the module system via a separate callPackage in bundle.nix instead
  };

  # ?
  system.stateVersion = "26.05";
}
