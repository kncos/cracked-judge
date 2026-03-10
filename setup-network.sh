#!/bin/bash

# this file sets up networking on the host so that the firecracker vm has access to the outside world
# note: 

set -eu

ip link del tap0 2>/dev/null || true
ip tuntap add dev tap0 mode tap
ip addr add 172.16.0.1/24 dev tap0
ip link set tap0 up

echo 1 > /proc/sys/net/ipv4/ip_forward

HOST_IFACE=$(ip route get 8.8.8.8 | awk '{print $5; exit}')
iptables -t nat -A POSTROUTING -o $HOST_IFACE -j MASQUERADE
iptables -A FORWARD -i tap0 -o $HOST_IFACE -j ACCEPT
iptables -A FORWARD -i $HOST_IFACE -o tap0 -m state --state RELATED,ESTABLISHED -j ACCEPT