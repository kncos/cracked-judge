#!/bin/sh
set -eu

# check env var
if [ -z "${CXX26_FLAGS:-}" ]; then
  echo "ERROR: CXX26_FLAGS environment var is not set"
  exit 1
fi

SYSTEM_H_DIR="/app/drivers/cpp26/include"
SYSTEM_H_PATH="$SYSTEM_H_DIR/system.h"
SYSTEM_GCH_PATH="$SYSTEM_H_DIR/system.h.gch"

if [ ! -d "$SYSTEM_H_DIR" ]; then
  echo "ERROR: $SYSTEM_H_DIR is not a valid directory."
  exit 1
fi

if [ ! -f "$SYSTEM_H_PATH" ]; then
  echo "ERROR: $SYSTEM_H_PATH is missing or is not a file."
  exit 1
fi

echo ">>> precompiling system.h..."
# shellcheck disable=SC2086  2>&1 | sed 's/^/[firecracker devtool] /'
if g++ ${CXX26_FLAGS} -x c++-header "$SYSTEM_H_PATH" 2>&1 | sed 's/^/[g++ output] /'; then
  if [ ! -f "$SYSTEM_GCH_PATH" ]; then
    echo "ERROR: g++ exited successfully, but $SYSTEM_GCH_PATH is missing"
    exit 1
  fi
else
  if [ ! -f "$SYSTEM_GCH_PATH" ]; then
    echo "ERROR: g++ exited unsuccessfully and $SYSTEM_GCH_PATH was not generated."
    exit 1
  else
    echo "WARN: g++ exited unsuccessfully, but $SYSTEM_GCH_PATH exists."
    echo ">>> this is its disk usage:" "$(du -sh "$SYSTEM_GCH_PATH")"
  fi
fi