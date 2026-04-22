{ pkgs, firecracker-bundle, ... }:
pkgs.vmTools.runInLinuxVM (
  pkgs.runCommand "vmroot.img"
    {
      nativeBuildinputs = with pkgs; [
        xfsprogs
        util-linux
      ];

      preVM = ''
        qemu-img create -f raw disk.img 16G
      '';
    }
    ''
      mkfs.xfs /dev/vda

      mkdir -p /mnt/target
      mount /dev/vda /mnt/target

      mkdir -p /mnt/target/deps

      cp -r ${firecracker-bundle}/* -t /mnt/target/deps/

      umount /mnt/target
      cp /dev/vda $out
    ''
)
