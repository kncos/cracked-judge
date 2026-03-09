#!/bin/bash
set -e

ROOTFS="rootfs.ext4"
sudo rm -rf mkosi.output/
rm rootfs.ext4
sudo mkosi build
sudo chown -R $(whoami): mkosi.output/
dd if=/dev/zero of="$ROOTFS" bs=1M count=2048
unshare --map-auto --map-root-user mkfs.ext4 -F -d mkosi.output/image "$ROOTFS"