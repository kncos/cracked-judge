# guest/targets/bundle.nix
{
  pkgs,
  lib,
  nixosConfig, # the evaluated nixosConfigurations.my-guest.config
  firecrackerKernel, # the fetchurl derivation from kernel.nix
}:

let
  # --- rootfs.ext4 ---
  # NixOS has make-disk-image.nix which produces an ext4 image directly.
  # We use it with the already-evaluated nixosConfig.
  rootfsImage = import (pkgs.path + "/nixos/lib/make-disk-image.nix") {
    inherit pkgs lib;

    config = nixosConfig;

    # Disk size — adjust as needed. "auto" tries to calculate it.
    diskSize = "auto";
    additionalSpace = "512M"; # headroom on top of calculated size

    format = "raw"; # raw = ext4, not qcow2
    fsType = "ext4";
    partitionTableType = "none"; # no partition table, raw ext4 for firecracker

    # Firecracker doesn't need a bootloader on the image
    installBootLoader = false;
    touchEFIVars = false;
  };

  # --- initrd ---
  # Use the initrd that NixOS built as part of the system closure.
  # This is kernel-agnostic because there are no modules.
  initrd = "${nixosConfig.system.build.initialRamdisk}/initrd";

  # --- vm-config.json ---
  # Firecracker API config. Kernel args tell it where root is.
  vmConfig = pkgs.writeText "vm-config.json" (
    builtins.toJSON {
      boot-source = {
        kernel_image_path = "vmlinux";
        boot_args = "console=ttyS0 reboot=k panic=1 pci=off root=/dev/vda rw init=${nixosConfig.system.build.toplevel}/init";
      };
      drives = [
        {
          drive_id = "rootfs";
          path_on_host = "rootfs.ext4";
          is_root_device = true;
          is_read_only = false;
        }
      ];
      machine-config = {
        vcpu_count = 2;
        mem_size_mib = 512;
      };
    }
  );

in
# Assemble everything into one output directory
pkgs.runCommand "firecracker-bundle" { } ''
  mkdir -p $out

  # vmlinux — the firecracker kernel binary
  cp ${firecrackerKernel} $out/vmlinux

  # rootfs.ext4 — the NixOS root filesystem image
  cp ${rootfsImage}/nixos.img $out/rootfs.ext4

  # initrd — NixOS systemd initrd (no kernel modules, fully portable)
  cp ${initrd} $out/initrd

  # vm-config.json
  cp ${vmConfig} $out/vm-config.json

  # Make vmlinux executable (firecracker requires this)
  chmod +x $out/vmlinux
''
