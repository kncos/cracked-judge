import { join } from "node:path";

class VmSocketManager {
  _srcDir: string;
  _targetDir: string;
  _defaultPort: number;

  constructor(params: {
    srcDir?: string | undefined;
    targetDir: string;
    defaultPort?: number | undefined;
  }) {
    const { srcDir, targetDir, defaultPort } = params;
    this._srcDir = srcDir || join(__dirname, "sockets");
    this._targetDir = targetDir;
    this._defaultPort = defaultPort || 52;
  }

  acquire_socket(params: { vmId: string; port?: number | undefined }) {
    const { vmId, port = this._defaultPort } = params;
    // srcDir will be a managed directory where we store all sockets outside
    // of the jailer directory, then we'll use a bind mount to place it in
    // jailer
    const socketPath = join(this._srcDir, vmId, `v.sock_${port}`);
    const socket = new VmSocket(socketPath, this._defaultPort);
    socket.listen();
    return socket;
  }
}
