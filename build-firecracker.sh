#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.env"

log()  { echo -e "\033[1;34m[INFO]\033[0m  $*"; }
warn() { echo -e "\033[1;33m[WARN]\033[0m  $*"; }
die()  { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; exit 1; }

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS] <source>

Sources:
  --dockerfile <path>     Build from a local Dockerfile (directory or file)
  --image <name:tag>      Use a DockerHub / local Docker image directly

Options:
  --name <name>           Output file (default: derived from source)
  --size <MB>             RootFS size in MB (default: ${ROOTFS_SIZE_MB})
  --output-dir <path>     Where to write the image + config (default: ./output)
  --kernel <path>         Local kernel binary (downloads if not provided)
  --no-download-kernel    Skip kernel download (must already exist in output-dir)
  --ssh-pubkey <path>     Install an SSH public key for root login
  --run                   Launch the VM immediately after building
  --help

Examples:
  $(basename "$0") --image ubuntu:22.04 --name my-ubuntu
  $(basename "$0") --dockerfile ./myapp --name myapp --run
  $(basename "$0") --image node:20-bookworm-slim --ssh-pubkey ~/.ssh/id_ed25519.pub

EOF
exit 0
}