set -eu

KERNEL_VERSION="6.1.163"
KERNEL_FILE="vmlinux-$KERNEL_VERSION"
ROOTFS="rootfs.ext4"
MKOSI_FILES=("mkosi.conf" "mkosi.postinst.chroot")

REBUILD_KERNEL=false
REBUILD_ROOTFS=false

help() {
  echo "Usage: $0 [options]"
  echo "  --rebuild          Rebuild everything"
  echo "  --rebuild-kernel   Force kernel build"
  echo "  --rebuild-rootfs   Force rootfs build"
  echo "  --help             Show this help"
}

die() {
  echo "ERROR: $1" >&2
  exit 1
}

build_kernel() {
  echo ">>> starting kernel build"
  WORKDIR=$(mktemp -d kernel-tmp-XXXXXXXX)

  pushd "$WORKDIR" > /dev/null

  # Download the source code archive
  echo "Downloading Firecracker v1.15.0 kernel build scripts..."
  curl -L https://github.com/firecracker-microvm/firecracker/archive/refs/tags/v1.15.0.tar.gz -o firecracker.tar.gz

  # Extract it
  echo "Extracting build scripts..."
  tar -xzf firecracker.tar.gz

  # build 6.1
  echo "Invoking kernel 6.1 build script..."
  ./firecracker-1.15.0/tools/devtool build_ci_artifacts kernels 6.1

  if ! ls ./firecracker-1.15.0/resources/x86_64/${KERNEL_FILE}* >/dev/null 2>&1; then
    popd > /dev/null
    die "Build failed: No matching files to ${KERNEL_FILE}* found in firecracker resources dir after build script"
  fi

  echo "Exporting artifacts..."
  cp ./firecracker-1.15.0/resources/x86_64/${KERNEL_FILE}* ..

  popd > /dev/null
  rm -rf "$WORKDIR"
  echo ">>> Kernel Build Complete"
}

build_rootfs() {
  echo ">>> Starting RootFS Build"
  [ -d "mkosi.output" ] && sudo rm -rf mkosi.output/
  
  sudo mkosi build
  sudo chown -R $(whoami): mkosi.output/
  
  truncate -s 2G "$ROOTFS"
  unshare --map-auto --map-root-user mkfs.ext4 -F -d mkosi.output/image "$ROOTFS"
  
  # Update the hash of mkosi files so we know they are "current"
  cat "${MKOSI_FILES[@]}" mkosi.extra/** 2>/dev/null | md5sum > .mkosi_hash
  echo ">>> RootFS Build Complete"
}

for arg in "$@"; do
  case $arg in
    --rebuild)
      REBUILD_KERNEL=true
      REBUILD_ROOTFS=true
      ;;
    --rebuild-kernel)
      REBUILD_KERNEL=true
      ;;
    --rebuild-rootfs)
      REBUILD_ROOTFS=true
      ;;
    --help)
      help
      exit 0
      ;;
  esac
done

if [ ! -f "$KERNEL_FILE" ] || [ "$REBUILD_KERNEL" = true ]; then
  build_kernel
else
  echo "Kernel $KERNEL_FILE exists, skipping build..."
fi

MKOSI_CHANGED=false
if [ -f .mkosi_hash ]; then
  CURRENT_HASH=$(cat "${MKOSI_FILES[@]}" mkosi.extra/** 2>/dev/null | md5sum)
  OLD_HASH=$(cat .mkosi_hash)
  if [ "$CURRENT_HASH" != "$OLD_HASH" ]; then
    MKOSI_CHANGED=true
  fi
else
  MKOSI_CHANGED=true # No hash file yet, must build
fi


if [ ! -f "$ROOTFS" ] || [ "$REBUILD_ROOTFS" = true ] || [ "$MKOSI_CHANGED" = true ]; then
  build_rootfs
else
  echo "RootFS exists and config hasn't changed, skipping build..."
fi