current state:

- vms are running in jailer and are communicating via sockets to the host

todo:

- refactor orchestrator code, add better RAII, maybe use `unshare` (namespaces for mounts?)
- possible startup process that initializes and execve into orchestrator
