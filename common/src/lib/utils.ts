// Types for the result object with discriminated union
type Success<T> = {
  data: T;
  error: null;
};

type Failure<E> = {
  data: null;
  error: E;
};

type Result<T, E = Error> = Success<T> | Failure<E>;
// Main wrapper function

export async function tryCatch<T, E = Error>(
  promise: Promise<T>,
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as E };
  }
}

export function tryCatchSync<T, E = Error>(fn: () => T): Result<T, E> {
  try {
    return { data: fn(), error: null };
  } catch (error) {
    return { data: null, error: error as E };
  }
}

export const indentStr = (
  str: string,
  count: number = 1,
  indent: string = "  ",
) => {
  const _indent = indent.repeat(count);
  return str.replace(/^/gm, _indent);
};

export const signalExitCodes: Record<number, string> = {
  130: "SIGINT: Interrupted, did you hit ctrl+c?",
  135: "SIGBUS: Memory/alignment issue?",
  137: "SIGKILL: Process was forcefully killed",
  139: "SIGSEGV: Something went wrong internally to the process",
  141: "SIGPIPE: Broken pipe",
  143: "SIGTERM: Process was manually terminated",
};
