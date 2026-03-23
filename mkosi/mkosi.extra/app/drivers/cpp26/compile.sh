#!/bin/bash


SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
cd "$SCRIPT_DIR"

# checn env
if [ -z "${CXX26_FLAGS:-}" ]; then
  set -a
  source cpp26.env
  set +a
else
  echo "INFO: CXX26_FLAGS are set to '${CXX26_FLAGS}'"
fi


g++ ${CXX26_FLAGS} -include include/system.h *.cpp -o main
