current progress:

- Got jailer workaround functional for communicating via vsocks to the host.
  - The problem was that the host orchestrator runs as root -> listens on ./v.sock_52 -> root now owns v.sock_52
  - Solution was hacky: started listening as root, then entered another terminal and did chmod 60000:60000, then ran jailer with firecracker as 60000:60000

better solution:

- make a managed directory for all sockets with ownership by uid 60000, use mount --bind to allow access from jailer

todo:

- Make a tmpfs for the big files (rootfs.ext4, vmlinux, vm-config.json) and use overlay fs to
  create the jailer dir
- bind sockets directory inside jailer dir

i'm working on this problem:

- root runs an orchestrator that spins up firecracker VMs inside of jailer as uid/gid 60000
- root listens in the expected directory on v.sock_52 so the guest can establish a connection and start talking to the host (for now i did this with socat, but i will use bun/typescript to listen ultimately)
- this socket now belongs to root (the v.sock_52 file that is generated! and socat throws an error if we make v.sock_52 first and chown to 60000 then try to listen, because it expects to create the file itself)
- firecracker guest inside jailer is 60000 so can't write to v.sock_52 because it doesn't own it

my workaround in the terminal just to get it working and make sure communication actually _could_ happen:

- listen as root in terminal 1
- navigate to the directory and chown to 60000 (while root is still listening)
- spawn jailer -- now it works because we have a socket that is owned by 60000, and root is still listening so its satisfied.

I need to move this to a more production grade setup. The app i'm developing will be an orchestrator that runs as root in the host VPS (or at least as a user with sysadmin capabilities so jailer can function as a child). I'm thinking about making a managed directory for all sockets, which i will then use mount --bind to install in the jailer directory.

The directory structure for jailer is like this:

/jail-root/firecracker/{vmid}/root/

/root is the chroot where firecracker is executed by jailer. So in that /root/, we need these files present:

- rootfs.ext4 (this can be huge!)
- vmlinux (the kernel i built)
- vm-config.json (specifies the config for firecracker)
- v.sock_52 (being listened to by the orchestrator)

rootfs.ext4, vmlinux, and vm-config.json need to be available. the firecracker VM does need some disk space to write files so for now rootfs.ext4 is read/write although if i could later make it readonly then attach a volume for firecracker to work in, that will be a better solution

v.sock_52 needs to be created by the orchestrator before jailer even starts and have a listener. Its a unix socket (yes i realize its called v.sock, but firecracker handles this as a unix socket apparently, so i don't think its actually a _literal_ vsock). v.sock_52 needs to be readable and writeable (at least, maybe even more)

so, currently, to get this setup working, i can:

- `cp --reflink=always` for each file into the vm chroot directory
- set up a listener in the vm chroot directory
- go in and chown 60000:60000 on every file in the root directory
- start jailer -- and it works.

Here's what I want to do:

- make a tmpfs containing everything
- use mount --bind and/or CoW, maybe some type of overlay or squashFS -- if this can be made _space efficient_, meaning it can somehow allow the firecracker instance to modify rootfs.ext4 without literally copying the entire rootfs.ext4, by maintaining some diff in the local directory, that would be awesome. But if not i'll accept CoW for now and later work on getting rootfs to be readonly and making a smaller volume for firecracker to operate on that is writeable

I can have any number of VMs with ids from vm0...vm{N}, so i will have some directory structure like:

/jail-root/firecracker/vm{x}/root

which overlays

/tmp/vm-base

- rootfs.ext4
- vmlinux
- vm-config.json

and /jail-root/firecracker could overlay something like:

/tmp/vm-socks/vm{x}/socks (or just v.sock_52 even)

It might also be fine to have these be sub-directories of /root, so i could have

/root/socks
/root/base

and then /root can just be whatever jailer writes

When a vm is destroyed, i need to quickly be able to destroy and re-initialize a blank directory, because jailer doesn't do any automatic cleanup, and so if we try to run jailer with an id, then exit, the try to run the same id, it fails.
