{
  pkgs,
  lib,
  config,
  ...
}:
let
  make-disk-image = import "${pkgs.path}/nixos/lib/make-disk-image.nix";
  cfg = config.firecracker.disk-image;
in
{
  options.firecracker.disk-image = {
    enable = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Whether or not to build the disk image";
    };

    diskSize = lib.mkOption {
      type = lib.types.either lib.types.int (lib.types.enum [ "auto" ]);
      default = "auto";
      description = "Size of the disk in MiB. If \"auto\" will be automatically calculated to fit the contents";
    };

    additionalSpace = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      default = "512M";
      description = "Additional overhead space to allocate when diskSize is \"auto\". Format as `{size}M` for MiB.";
    };

    package = lib.mkOption {
      type = lib.types.package;
      readOnly = true;
      description = "Firecracker rootfs image derivation result";
    };
  };

  config.firecracker.disk-image = lib.mkIf cfg.enable {
    # see: https://ryantm.github.io/nixpkgs/builders/images/makediskimage/
    # see: https://ryantm.github.io/nixpkgs/builders/images/makediskimage/
    package = make-disk-image {
      # inherit the system setup. config is the nixos configuration to be
      # installed onto the disk image
      inherit pkgs lib config;
      inherit (cfg) diskSize additionalSpace;

      additionalPaths = [ ];
      # can be raw or qcow2, for firecracker we don't use qcow2
      format = "raw";
      # nix-store only image, defaults to false
      onlyNixStore = false;
      # only rootfs.ext4 for firecracker
      partitionTableType = "none";
      # firecracker is the bootloader
      installBootLoader = false;
      touchEFIVars = false;
      # root fs type, ext4 for firecracker
      fsType = "ext4";
    };
  };
}
