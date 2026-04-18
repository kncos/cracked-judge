import { AsyncProc } from "./async-proc";

export * from "./utils";

export const createAsyncProc = async (
  ...params: ConstructorParameters<typeof AsyncProc>
) => {
  const proc = new AsyncProc(...params);
  await proc.create();
  return proc;
};
