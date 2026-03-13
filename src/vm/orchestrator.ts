import type { VmConfig } from ".";

export class VmOrchestrator implements AsyncDisposable {
  private constructor(
    public readonly conf: VmConfig,
    private stack: AsyncDisposableStack = new AsyncDisposableStack(),
    private vmIds: Set<string> = new Set(),
  ) {}

  private static instance: VmOrchestrator | null = null;

  public static init = async (config: VmConfig) => {
    if (VmOrchestrator.instance === null) {
      VmOrchestrator.instance = new VmOrchestrator(config);
    } else {
      await VmOrchestrator.instance[Symbol.asyncDispose]();
      VmOrchestrator.instance = new VmOrchestrator(config);
    }
  };

  public static spawnVm = () => {};

  public static killVm = () => {};

  async [Symbol.asyncDispose]() {}
}
