type Success<T> = {
  status: "success";
  data: T;
  timeout: null;
  error: null;
};

type Timeout<U> = {
  status: "timeout";
  data: null;
  timeout: U;
  error: null;
};

type Failure<E> = {
  status: "failure";
  data: null;
  timeout: null;
  error: E;
};

type Result<T, U = undefined, E = Error> = Success<T> | Timeout<U> | Failure<E>;

export async function tryCatchTimeout<T, U = undefined, E = Error>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout?: () => U | Promise<U>,
): Promise<Result<T, U, E>> {
  if (timeoutMs <= 0) {
    throw new RangeError("Timeout must be greater than zero");
  }
  let timer: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<Result<T, U, E>>((resolve, reject) => {
    timer = setTimeout(() => {
      void Promise.resolve(onTimeout?.())
        .then((res) => {
          resolve({
            status: "timeout",
            data: null,
            timeout: res as U,
            error: null,
          });
        })
        .catch(reject);
    }, timeoutMs);
  });

  const mainPromise: Promise<Result<T, U, E>> = promise.then((v) => ({
    status: "success",
    data: v,
    timeout: null,
    error: null,
  }));

  try {
    return await Promise.race([mainPromise, timeoutPromise]);
  } catch (error) {
    return {
      status: "failure",
      data: null,
      timeout: null,
      error: error as E,
    };
  } finally {
    clearTimeout(timer ?? undefined);
  }
}
