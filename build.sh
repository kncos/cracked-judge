set -eu

KERNEL_VERSION="6.1.163"
KERNEL_FILE="vmlinux-$KERNEL_VERSION"
ROOTFS="rootfs.ext4"
MKOSI_FILES=("mkosi.conf" "mkosi.postinst.chroot")
get_hash() {
  {
    cat "${MKOSI_FILES[@]}"
    find mkosi.extra -type f | sort | xargs cat
  } | md5sum
}

REBUILD_KERNEL=false
REBUILD_ROOTFS=false

ROOT_DIR=$(pwd)

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

cleanup_on_exit() {
  cd "$ROOT_DIR"
  if [ -n "${KERNEL_WORKDIR:-}" ] && [ -d "$KERNEL_WORKDIR" ]; then
    echo "Cleaning up temporary directory: $KERNEL_WORKDIR"
    sudo rm -rf $KERNEL_WORKDIR
  fi
  if [ -n "mkosi.output" ] && [ -d "mkosi.output" ]; then
    echo "Cleaning up mkosi.output"
    sudo rm -rf "mkosi.output"
  fi
}
trap cleanup_on_exit EXIT

KERNEL_WORKDIR=""
build_kernel() {
  echo ">>> starting kernel build"
  # Create the temp dir in the CURRENT directory so the final "cp .. " works correctly
  KERNEL_WORKDIR=$(mktemp -d ./kernel-tmp-XXXXXXXX)

  pushd "$KERNEL_WORKDIR" > /dev/null

  echo "Cloning Firecracker v1.15.0..."
  # Git clone instead of curl/tar to satisfy devtool requirements
  git clone --depth 1 --branch v1.15.0 https://github.com/firecracker-microvm/firecracker.git

  echo "Invoking kernel 6.1 build script..."
  cd firecracker

  set +e
  ./tools/devtool build_ci_artifacts kernels 6.1 2>&1 | sed 's/^/[firecracker devtool] /'
  EXIT_CODE=${PIPESTATUS[0]}
  echo "Devtool finished with exit code: $EXIT_CODE"

  set -e

  # Note: devtool creates the resources folder INSIDE the firecracker repo
  # The path is now ./resources/... relative to the git root
  SEARCH_PATH="./resources/x86_64/${KERNEL_FILE}"*

  if ! ls $SEARCH_PATH >/dev/null 2>&1; then
    popd > /dev/null
    die "Build failed: No matching files to ${KERNEL_FILE}* found."
  fi

  echo "Exporting artifacts..."
  # Since we are inside $KERNEL_WORKDIR/firecracker, ".." is $KERNEL_WORKDIR, 
  # so we need "../.." to get back to the project root.
  cp $SEARCH_PATH ../..

  popd > /dev/null
  # The 'trap' will now handle 'rm -rf $KERNEL_WORKDIR' automatically
  echo ">>> Kernel Build Complete"

  sudo rm -rf "$KERNEL_WORKDIR"
  KERNEL_WORKDIR=""
}

build_rootfs() {
  echo ">>> Starting RootFS Build"
  [ -d "mkosi.output" ] && sudo rm -rf mkosi.output/
  
  sudo mkosi build
  sudo chown -R $(whoami): mkosi.output/
  
  truncate -s 2G "$ROOTFS"
  unshare --map-auto --map-root-user mkfs.ext4 -F -d mkosi.output/image "$ROOTFS"
  
  # Update the hash of mkosi files so we know they are "current"
  get_hash >> .mkosi_hash
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
  CURRENT_HASH=$(get_hash)
  OLD_HASH=$(cat .mkosi_hash)
  if [ "$CURRENT_HASH" != "$OLD_HASH" ]; then
    # echo "old hash: $OLD_HASH" >> hashes.txt
    # echo "new hash: $CURRENT_HASH" >> hashes.txt
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