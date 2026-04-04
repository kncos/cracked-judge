{
  pkgs,
  lib,
  config,
  ...
}:
let
  nixKernelPath = config.firecracker.kernel.package;
  nixRootfsPath = "${config.firecracker.disk-image.package}/nixos.img";
  nixInitrdPath = config.system.build.initialRamdisk or null;
  kernelInitParam = "${config.system.build.toplevel}/init";
  cfg = config.firecracker.vm-config;
in
{
  options.firecracker.vm-config = {
    enable = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Whether or not to generate vm-config.json for firecracker";
    };

    socketPath = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      default = null;
      description = "Path where firecracker should place sockets. If null, no sockets will be created.";
    };

    vcpus = lib.mkOption {
      type = lib.types.int;
      default = 1;
      description = "How many vcpus to allocate to each firecracker VM";
    };

    memory = lib.mkOption {
      type = lib.types.int;
      default = 1024;
      description = "How much memory to allocate to each firecracker instance in MiB";
    };

    useInitrd = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Whether or not to use NixOS's initrd with firecracker. no-op if initrd disabled in Nix system cfg";
    };

    rootfsPath = lib.mkOption {
      type = lib.types.str;
      default = nixRootfsPath;
      description = "Path to rootfs image. If omitted, uses the path to the rootfs image in /nix/store, but makes it readonly";
    };

    kernelPath = lib.mkOption {
      type = lib.types.str;
      default = nixKernelPath;
      description = "Path to kernel binary. If omitted, uses the path to the kernel image in /nix/store";
    };

    package = lib.mkOption {
      type = lib.types.package;
      readOnly = true;
      description = "firecracker vm-config.json derivation result";
    };

    # kernel path, kernel init param, rootfs path, and initrd path can all be generated
  };

  config.firecracker.vm-config = {
    package = pkgs.writeText "vm-config.json" (
      builtins.toJSON (
        {
          boot-source = {
            # this should be a firecracker upstream kernel with no modules
            kernel_image_path = "${cfg.kernelPath}";
            # We don't specify nix boot args because firecracker is the bootloader
            boot_args = "console=ttyS0 reboot=k panic=1 pci=off root=/dev/vda rw init=${kernelInitParam}";
          }
          # initrd is optional. NixOS depends on initrd to perform "stage 1" setup.
          # It loads kernel modules, starts udev, mounts filesytems, runs fsck, handles luks/raid,
          # and handles hibernate resume. But for firecracker, we don't need any of that,
          # so initrd can be skipped
          // pkgs.lib.optionalAttrs (cfg.useInitrd && nixInitrdPath != null) {
            initrd_path = nixInitrdPath;
          };
          # TODO: since this is not readonly it actually modifies the nixos.img that is in /nix/store
          drives = [
            {
              drive_id = "rootfs";
              path_on_host = "${cfg.rootfsPath}";
              is_root_device = true;
              is_read_only = false;
            }
          ];
          machine-config = {
            vcpu_count = cfg.vcpus;
            mem_size_mib = cfg.memory;
          };
        }
        # vsock is how we communicate with the outside world, there is no
        # networking. Without this, the only way to access it would be to use a shell
        // pkgs.lib.optionalAttrs (cfg.socketPath != null) {
          vsock = {
            guest_cid = 3;
            uds_path = "${cfg.socketPath}";
          };
        }
      )
    );
  };
}
