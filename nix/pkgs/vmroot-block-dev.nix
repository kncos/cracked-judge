{
  pkgs,
  firecracker-bundle,
  diskSizeMiB ? 16384,
  ...
}:
pkgs.runCommand "vmroot-block-dev"
  {
    nativeBuildInputs = with pkgs; [
      xfsprogs
      lkl
      coreutils
      rsync
    ];
    deps = firecracker-bundle;
  }
  ''
    set -eux

    cd "$NIX_BUILD_TOP"

    truncate -s ${toString diskSizeMiB}M "$out"
    mkfs.xfs -L vmroot -f "$out"

    mkdir -p deps
    rsync --archive --hard-links "$deps/" deps/

    find deps/

    cptofs -t xfs -i "$out" deps /
    cptofs -t xfs -i "$out" deps/rootfs.ext4 /deps/rootfs.ext4
    cptofs -t xfs -i "$out" deps/vmlinux /deps/vmlinux
    cptofs -t xfs -i "$out" deps/vm-config.json /deps/vm-config.json
  ''
