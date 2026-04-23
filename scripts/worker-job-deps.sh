#!/bin/sh
set -eu

TARGET_DIR=""
URLS=""
FILES=""

# quick check
check_deps() {
  ret=0
  deps="tar curl realpath"
  for cmd in $deps; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      echo "Error: Required command '$cmd' failed dependency check." >&2
      ret=1
    fi
  done

  return "$ret"
}

unpack_cmd() { 
  if [ -d "$TARGET_DIR" ]; then
    tar -xf - -C "$TARGET_DIR"
  else
    echo "Error: cannot unpack to $TARGET_DIR, not a directory!" >&2
    exit 1
  fi
}

cleanup() {
  # pids might not be set yet
  set +u
  for pid in $PIDS; do
    kill "$pid" 2>/dev/null || true
  done
  set -u
}
trap cleanup EXIT INT TERM

help() {
  echo "Usage: $1 [<options>] <command>"
  echo ""
  echo "ABOUT:"
  echo "  This script sources one (or many) tarballs and extracts their contents"
  echo "  into the directory provided in output. Contents of all tarballs are"
  echo "  merged into the output directory, meaning conflicting files will cause"
  echo "  overwrites."
  echo ""
  echo "  When conflicts arise, the content of --fetch sources takes precedence"
  echo "  over those from --file sources. Otherwise, precedence is the order in"
  echo "  which sources have been passed as arguments. If you want custom"
  echo "  behavior, run the script multiple times with the same --output arg."
  echo ""
  echo "OPTIONS:"
  echo "  --fetch   <URL>     URL to fetch a tarball from"
  echo "  --file    <PATH>    Path to a tarball"
  echo ""
  echo "COMMANDS:"
  echo "  --output  <PATH>    Directory where outputs will be merged"
  echo "  --check-deps        Quick check to ensure dependencies are present"
  echo "                      for this script."
}

parse_initialize_args() {
  NAME="$1"
  shift 1

  while [ "$#" -gt 0 ]; do
    case "$1" in
      --fetch)
        if [ -n "$2" ]; then
          URLS="$URLS $2"
          shift 2
        else
          echo "Error: --fetch requires an argument" >&2
          help "$NAME"
          exit 1
        fi
      ;;
      --file)
        if [ -n "$2" ] && [ -f "$2" ]; then
          FILES="$FILES $2"
          shift 2
        else
          echo "Error: --file requires a valid regular file" >&2
          help "$NAME"
          exit 1
        fi
      ;;
      --output)
        if [ -n "$2" ]; then
          TARGET_DIR="$(realpath "$2")"
          # side effect is fine
          mkdir -p "$TARGET_DIR"
          shift 2
        else
          echo "Error: --output path cannot be empty" >&2
          help "$NAME"
          exit 1
        fi
      ;;
      --check-deps)
        if ! check_deps; then
          echo "Error: Failed dependencies check." >&2
          exit 1
        else
          echo "Dependencies check succeeded"
          exit 0
        fi
      ;;
      *)
        echo "Unknown option: $1" >&2
        help "$NAME"
        exit 1
      ;;
    esac
  done

  if [ -z "$TARGET_DIR" ]; then
    echo "Error: --output was not provided, cannot place files anywhere." >&2
    help "$NAME"
    exit 1
  fi
}

initialize() {
  # set -x

  # these should all succeed
  for file in $FILES; do
    if ! (unpack_cmd < "$file"); then
      echo "Failed to unpack file at $file. Is it a tarball?" >&2
      exit 1
    fi
  done

  PIDS=""
  # these go in parallel
  for url in $URLS; do
    (
      set -e
      curl -sSL "$url" | unpack_cmd
    ) &
    PIDS="$PIDS $!"
  done

  # await all pids
  for pid in $PIDS; do
    if ! wait "$pid"; then
      echo "Error: A download or extract task failed! (pid: $pid)." >&2
      exit 1
    fi
  done
}

parse_initialize_args "$0" "$@"
initialize