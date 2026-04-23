#!/bin/sh
set -eu

check_deps() {
  ret=0
  deps="ip echo iptables firecracker jailer mount umount rm mkdir chown chmod curl"
  for cmd in $deps; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      echo "Error: Required command '$cmd' failed dependency check." >&2
      ret=1
    fi
  done

  return "$ret"
}

# set variables
get_vars() {
  # i want to see the commands that get run when we do an actual vm setup/teardown task
  set -x

  VM_IDX="$1"
  NS="fc${VM_IDX}"
  VETH_HOST="veth${VM_IDX}"
  VETH_NS="veth0"

  BRIDGE="br0"
  BRIDGE_IP="10.0.0.1"
  BRIDGE_PREFIX="16"

  NS_VETH_IP="10.0.${VM_IDX}.2"
  NS_VETH_PREFIX="16"
  
  VMROOT="/var/lib/cracked-judge"

  VM_JAIL_DIR="${VMROOT}/jail/firecracker/${VM_IDX}"
  VM_RUN_DIR="${VMROOT}/run/${VM_IDX}"

  VM_UID="60000"
  VM_GID="60000"
}

setup_network() {
  get_vars "$1"

  # configure bridge if it doesn't already exist
  if ! ip link show "$BRIDGE" > /dev/null 2>&1; then
    ip link add name "$BRIDGE" type bridge
    ip addr add "${BRIDGE_IP}/${BRIDGE_PREFIX}" dev "$BRIDGE"
    ip link set "$BRIDGE" up
    echo 1 > /proc/sys/net/ipv4/ip_forward
    iptables -P FORWARD DROP
  fi

  # network namespace
  ip netns add "$NS"

  # vmtap0 inside the namespace, same name every time
  ip netns exec "$NS" ip tuntap add name vmtap0 mode tap
  ip netns exec "$NS" ip addr add 192.168.241.1/29 dev vmtap0
  ip netns exec "$NS" ip link set vmtap0 up

  # veth pair: host end joins bridge (no IP), ns end gets unique IP
  ip link add name "$VETH_HOST" type veth peer name "$VETH_NS" netns "$NS"
  ip link set "$VETH_HOST" master "$BRIDGE"
  ip link set "$VETH_HOST" up

  ip netns exec "$NS" ip addr add "${NS_VETH_IP}/${NS_VETH_PREFIX}" dev "$VETH_NS"
  ip netns exec "$NS" ip link set "$VETH_NS" up

  # default route inside ns exits via veth toward bridge
  ip netns exec "$NS" ip route add default via "$BRIDGE_IP"

  # MASQUERADE: rewrite src 192.168.241.2 → 10.0.X.2 as traffic leaves ns
  ip netns exec "$NS" iptables -t nat -A POSTROUTING \
    -s 192.168.241.0/29 -o "$VETH_NS" -j MASQUERADE

  # DNAT: rewrite dst 10.0.X.2 → 192.168.241.2 for traffic entering ns
  ip netns exec "$NS" iptables -t nat -A PREROUTING \
    -i "$VETH_NS" -d "${NS_VETH_IP}" -j DNAT --to-destination 192.168.241.2

  # forward: allow traffic in and out of this veth through the bridge
  iptables -I FORWARD 1 -i "$VETH_HOST" -j ACCEPT
  iptables -I FORWARD 1 -o "$VETH_HOST" -j ACCEPT
}

teardown_network() {
  get_vars "$1"

  iptables -D FORWARD -i "$VETH_HOST" -j ACCEPT 2>/dev/null || true
  iptables -D FORWARD -o "$VETH_HOST" -j ACCEPT 2>/dev/null || true

  ip link del "$VETH_HOST" 2>/dev/null || true
  ip netns del "$NS" 2>/dev/null || true
}

cleanup_vm_fs() {
  get_vars "$1"

  umount -l "${VM_JAIL_DIR}/root/run" 2>/dev/null || true
  rm -rf "${VM_JAIL_DIR}" || true
  rm -rf "${VM_RUN_DIR}" || true
}

setup_vm_fs() {
  get_vars "$1"
  # bind mount for sockets (firecracker.socket)
  mkdir -p "${VM_JAIL_DIR}/root/run"
  mkdir -p "${VM_RUN_DIR}"
  mount --bind \
    --map-users 0:${VM_UID}:65534 \
    --map-groups 0:${VM_GID}:65534 \
    "${VM_RUN_DIR}" "${VM_JAIL_DIR}/root/run"

  # overlay mount 
  mkdir -p "${VM_JAIL_DIR}/root/"
  cp -r --reflink=auto "${VMROOT}/deps/" -t "${VM_JAIL_DIR}/root/"
  chown -R "${VM_UID}:${VM_GID}" "${VM_JAIL_DIR}/root/deps"
  # /{vmroot}/deps might be a ro bind mount from /nix/store or something, fix perms:
  find "${VM_JAIL_DIR}/root/deps" -type d -exec chmod 755 {} \;
  find "${VM_JAIL_DIR}/root/deps" -type f -exec chmod 644 {} \;
}


start_vm() {
  get_vars "$1"

  # filesystem
  cleanup_vm_fs "$1"
  setup_vm_fs "$1"

  # networking
  teardown_network "$1"
  setup_network "$1"

  exec jailer \
    --uid "$VM_UID" \
    --gid "$VM_GID" \
    --id "$VM_IDX" \
    --netns "/var/run/netns/${NS}" \
    --exec-file "$(which firecracker)" \
    --chroot-base-dir "${VMROOT}/jail" \
    -- \
    --config-file "deps/vm-config.json"
}

stop_vm() {
  get_vars "$1"

  # stop firecracker via its Api
  curl --max-time 30 --unix-socket "${VM_RUN_DIR}/firecracker.socket" \
    -X PUT http://localhost/actions \
    -H "Content-Type: application/json" \
    -d '{"action_type": "SendCtrlAltDel"}' || true

  # cleanup its filesystem -- note: this can actually fail if
  # curl hangs, which is partially why we do cleanup_vm_fs on startup too
  cleanup_vm_fs "$1"
  teardown_network "$1"
}

# we allow vm indices from 0 to 255
is_valid_idx() {
  BASE_IDX_ERR_MSG="ERROR: Expected numeric value between 0-255"
  # value empty
  if [ -z "$1" ]; then 
    echo "${BASE_IDX_ERR_MSG}: value was empty" >&2
    return 1
  fi

  # check if non-alphanum
  case "$1" in
    *[!0-9]*) 
      echo "${BASE_IDX_ERR_MSG}: value was non-numeric" >&2
      return 1
    ;;
  esac

  # check numeric range
  if [ "$1" -ge 0 ] && [ "$1" -le 255 ]; then
    return 0
  else
    echo "${BASE_IDX_ERR_MSG}: value was not in the range 0-255" >&2
    return 1
  fi
}

# shell name, command, 
help() {
  echo "Usage: $1 <command> [vm-idx]"
  echo ""
  echo "Commands:"
  echo "  start <vm-idx>              Start a virtual machine"
  echo "  stop <vm-idx>               Stop a virtual machine (performs idempotent cleans up if vm isn't running)"
  echo "  setup-network <vm-idx>      Sets up networking rules for a vm-idx"
  echo "  teardown-network <vm-idx>   Removes networking rules for a vm-idx"
  echo "  check-deps                  Quick and dirty dependency check using which"
  echo "  help                        Display this menu"
}

if [ -z "${1:-}" ]; then
  help "$0"
  echo "Error: No command was provided" >&2
  exit 1
fi

if [ "$1" = "help" ]; then
  help "$0"
  exit 0;
fi

if [ "$1" = "check-deps" ]; then
  if check_deps; then
    echo "All dependency checks succeeded!"
    exit 0
  else
    echo "Some dependency checks failed" 
    exit 1
  fi
fi
  
# handle commands that require <vm-idx> ...
if ! is_valid_idx "${2:-}" >/dev/null 2>&1; then
  help "$0"
  # print error msg after help
  is_valid_idx "${2:-}"
  exit 1
fi

case "$1" in
  start) start_vm "$2" ;;
  stop) stop_vm "$2" ;;
  setup-network) setup_network "$2" ;;
  teardown-network) teardown_network "$2" ;;
  *)
    help "$0"
    echo "Error: invalid command"
    exit 1
    ;;
esac