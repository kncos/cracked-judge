#!/bin/bash
# build-rootfs.sh -- builds the root filesystem using mkosi for firecracker

set -eu

KERNEL_VERSION="6.1.163"

cleanup() {
  echo "Cleaning up artifacts..."
  [ -d "mkosi.output" && sudo rm -rf mkosi.output ]
}

ROOTFS="rootfs.ext4"

echo "Deleting any old build artifacts..."
[ -d "mkosi.output" ] && sudo rm -rf mkosi.output/
[ -f "$ROOTFS" ] && rm rootfs.ext4

echo "Running mkosi build..."
sudo mkosi build
sudo chown -R $(whoami): mkosi.output/

echo "Creating $ROOTFS..."
truncate -s 2G "$ROOTFS"
unshare --map-auto --map-root-user mkfs.ext4 -F -d mkosi.output/image "$ROOTFS"

echo "Done, firecracker root filesystem is at: $ROOTFS..."