#!/bin/bash
# build-kernel.sh -- builds the linux kernel 6.1 for firecracker

set -eu

WORKDIR="kernel"
rm -rf "$WORKDIR"
mkdir -p "$WORKDIR"
cd "$WORKDIR"

cleanup() {
  echo "Cleaning up source files..."
  rm -rf firecracker-1.15.0 firecracker.tar.gz
}
trap cleanup EXIT

# Download the source code archive
echo "Downloading Firecracker v1.15.0..."
curl -L https://github.com/firecracker-microvm/firecracker/archive/refs/tags/v1.15.0.tar.gz -o firecracker.tar.gz

# Extract it
tar -xzf firecracker.tar.gz

# build 6.1
echo "Invoking kernel 6.1 build script..."
./firecracker/tools/devtool build_ci_artifacts kernels 6.1

echo "Exporting artifacts..."
cp ./resources/x86_64/vmlinux-* . 2>/dev/null || true

echo "Done. Kernels are located in $WORKDIR"