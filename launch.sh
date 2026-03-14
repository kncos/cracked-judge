set -eux

sudo find /tmp/vmroot/jail/firecracker/*/root/ -type d | grep -E "socks|base" | xargs -r sudo umount -l
sudo rm -rf /tmp/vmroot
# sudo make all
cp -r vmroot /tmp/
bun build --target bun --outfile=/tmp/vmroot/index.js src/index.ts
sudo bun run /tmp/vmroot/index.js
