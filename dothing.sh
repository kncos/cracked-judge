set -e
cd linux-6.1.163

cat >> .config << 'EOF'
CONFIG_DEVTMPFS=y
CONFIG_DEVTMPFS_MOUNT=y
EOF

make olddefconfig
grep CONFIG_DEVTMPFS .config
make vmlinux -j$(nproc)
cp vmlinux ../vmlinux-6.1.163
