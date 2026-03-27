2025-03-26

- the VMs don't have the correct path for firecracker/jailer bins; add cwd to AsyncProc or provide the correct paths (or both)
- host.ts is still a mess because it relied on a bunch of the old stuff that was removed
