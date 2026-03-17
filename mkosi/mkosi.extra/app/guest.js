// @bun
// src/guest.ts
var {$ } = globalThis.Bun;

// src/lib/utils.ts
async function tryCatch(promise) {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// node_modules/@orpc/shared/dist/index.mjs
function resolveMaybeOptionalOptions(rest) {
  return rest[0] ?? {};
}
function toArray(value) {
  return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
}
function readAsBuffer(source) {
  if (typeof source.bytes === "function") {
    return source.bytes();
  }
  return source.arrayBuffer();
}
var ORPC_NAME = "orpc";
var ORPC_SHARED_PACKAGE_NAME = "@orpc/shared";
var ORPC_SHARED_PACKAGE_VERSION = "1.13.6";

class AbortError extends Error {
  constructor(...rest) {
    super(...rest);
    this.name = "AbortError";
  }
}
function once(fn) {
  let cached;
  return () => {
    if (cached) {
      return cached.result;
    }
    const result = fn();
    cached = { result };
    return result;
  };
}
function sequential(fn) {
  let lastOperationPromise = Promise.resolve();
  return (...args) => {
    return lastOperationPromise = lastOperationPromise.catch(() => {}).then(() => {
      return fn(...args);
    });
  };
}
var SPAN_ERROR_STATUS = 2;
var GLOBAL_OTEL_CONFIG_KEY = `__${ORPC_SHARED_PACKAGE_NAME}@${ORPC_SHARED_PACKAGE_VERSION}/otel/config__`;
function getGlobalOtelConfig() {
  return globalThis[GLOBAL_OTEL_CONFIG_KEY];
}
function startSpan(name, options = {}, context) {
  const tracer = getGlobalOtelConfig()?.tracer;
  return tracer?.startSpan(name, options, context);
}
function setSpanError(span, error, options = {}) {
  if (!span) {
    return;
  }
  const exception = toOtelException(error);
  span.recordException(exception);
  if (!options.signal?.aborted || options.signal.reason !== error) {
    span.setStatus({
      code: SPAN_ERROR_STATUS,
      message: exception.message
    });
  }
}
function toOtelException(error) {
  if (error instanceof Error) {
    const exception = {
      message: error.message,
      name: error.name,
      stack: error.stack
    };
    if ("code" in error && (typeof error.code === "string" || typeof error.code === "number")) {
      exception.code = error.code;
    }
    return exception;
  }
  return { message: String(error) };
}
async function runWithSpan({ name, context, ...options }, fn) {
  const tracer = getGlobalOtelConfig()?.tracer;
  if (!tracer) {
    return fn();
  }
  const callback = async (span) => {
    try {
      return await fn(span);
    } catch (e) {
      setSpanError(span, e, options);
      throw e;
    } finally {
      span.end();
    }
  };
  if (context) {
    return tracer.startActiveSpan(name, options, context, callback);
  } else {
    return tracer.startActiveSpan(name, options, callback);
  }
}
async function runInSpanContext(span, fn) {
  const otelConfig = getGlobalOtelConfig();
  if (!span || !otelConfig) {
    return fn();
  }
  const ctx = otelConfig.trace.setSpan(otelConfig.context.active(), span);
  return otelConfig.context.with(ctx, fn);
}

class AsyncIdQueue {
  openIds = /* @__PURE__ */ new Set;
  queues = /* @__PURE__ */ new Map;
  waiters = /* @__PURE__ */ new Map;
  get length() {
    return this.openIds.size;
  }
  get waiterIds() {
    return Array.from(this.waiters.keys());
  }
  hasBufferedItems(id) {
    return Boolean(this.queues.get(id)?.length);
  }
  open(id) {
    this.openIds.add(id);
  }
  isOpen(id) {
    return this.openIds.has(id);
  }
  push(id, item) {
    this.assertOpen(id);
    const pending = this.waiters.get(id);
    if (pending?.length) {
      pending.shift()[0](item);
      if (pending.length === 0) {
        this.waiters.delete(id);
      }
    } else {
      const items = this.queues.get(id);
      if (items) {
        items.push(item);
      } else {
        this.queues.set(id, [item]);
      }
    }
  }
  async pull(id) {
    this.assertOpen(id);
    const items = this.queues.get(id);
    if (items?.length) {
      const item = items.shift();
      if (items.length === 0) {
        this.queues.delete(id);
      }
      return item;
    }
    return new Promise((resolve, reject) => {
      const waitingPulls = this.waiters.get(id);
      const pending = [resolve, reject];
      if (waitingPulls) {
        waitingPulls.push(pending);
      } else {
        this.waiters.set(id, [pending]);
      }
    });
  }
  close({ id, reason } = {}) {
    if (id === undefined) {
      this.waiters.forEach((pendingPulls, id2) => {
        const error2 = reason ?? new AbortError(`[AsyncIdQueue] Queue[${id2}] was closed or aborted while waiting for pulling.`);
        pendingPulls.forEach(([, reject]) => reject(error2));
      });
      this.waiters.clear();
      this.openIds.clear();
      this.queues.clear();
      return;
    }
    const error = reason ?? new AbortError(`[AsyncIdQueue] Queue[${id}] was closed or aborted while waiting for pulling.`);
    this.waiters.get(id)?.forEach(([, reject]) => reject(error));
    this.waiters.delete(id);
    this.openIds.delete(id);
    this.queues.delete(id);
  }
  assertOpen(id) {
    if (!this.isOpen(id)) {
      throw new Error(`[AsyncIdQueue] Cannot access queue[${id}] because it is not open or aborted.`);
    }
  }
}
function isAsyncIteratorObject(maybe) {
  if (!maybe || typeof maybe !== "object") {
    return false;
  }
  return "next" in maybe && typeof maybe.next === "function" && Symbol.asyncIterator in maybe && typeof maybe[Symbol.asyncIterator] === "function";
}
var fallbackAsyncDisposeSymbol = Symbol.for("asyncDispose");
var asyncDisposeSymbol = Symbol.asyncDispose ?? fallbackAsyncDisposeSymbol;

class AsyncIteratorClass {
  #isDone = false;
  #isExecuteComplete = false;
  #cleanup;
  #next;
  constructor(next, cleanup) {
    this.#cleanup = cleanup;
    this.#next = sequential(async () => {
      if (this.#isDone) {
        return { done: true, value: undefined };
      }
      try {
        const result = await next();
        if (result.done) {
          this.#isDone = true;
        }
        return result;
      } catch (err) {
        this.#isDone = true;
        throw err;
      } finally {
        if (this.#isDone && !this.#isExecuteComplete) {
          this.#isExecuteComplete = true;
          await this.#cleanup("next");
        }
      }
    });
  }
  next() {
    return this.#next();
  }
  async return(value) {
    this.#isDone = true;
    if (!this.#isExecuteComplete) {
      this.#isExecuteComplete = true;
      await this.#cleanup("return");
    }
    return { done: true, value };
  }
  async throw(err) {
    this.#isDone = true;
    if (!this.#isExecuteComplete) {
      this.#isExecuteComplete = true;
      await this.#cleanup("throw");
    }
    throw err;
  }
  async[asyncDisposeSymbol]() {
    this.#isDone = true;
    if (!this.#isExecuteComplete) {
      this.#isExecuteComplete = true;
      await this.#cleanup("dispose");
    }
  }
  [Symbol.asyncIterator]() {
    return this;
  }
}
function asyncIteratorWithSpan({ name, ...options }, iterator) {
  let span;
  return new AsyncIteratorClass(async () => {
    span ??= startSpan(name);
    try {
      const result = await runInSpanContext(span, () => iterator.next());
      span?.addEvent(result.done ? "completed" : "yielded");
      return result;
    } catch (err) {
      setSpanError(span, err, options);
      throw err;
    }
  }, async (reason) => {
    try {
      if (reason !== "next") {
        await runInSpanContext(span, () => iterator.return?.());
      }
    } catch (err) {
      setSpanError(span, err, options);
      throw err;
    } finally {
      span?.end();
    }
  });
}

class EventPublisher {
  #listenersMap = /* @__PURE__ */ new Map;
  #maxBufferedEvents;
  constructor(options = {}) {
    this.#maxBufferedEvents = options.maxBufferedEvents ?? 100;
  }
  get size() {
    return this.#listenersMap.size;
  }
  publish(event, payload) {
    const listeners = this.#listenersMap.get(event);
    if (!listeners) {
      return;
    }
    for (const listener of listeners) {
      listener(payload);
    }
  }
  subscribe(event, listenerOrOptions) {
    if (typeof listenerOrOptions === "function") {
      let listeners = this.#listenersMap.get(event);
      if (!listeners) {
        this.#listenersMap.set(event, listeners = []);
      }
      listeners.push(listenerOrOptions);
      return once(() => {
        listeners.splice(listeners.indexOf(listenerOrOptions), 1);
        if (listeners.length === 0) {
          this.#listenersMap.delete(event);
        }
      });
    }
    const signal = listenerOrOptions?.signal;
    const maxBufferedEvents = listenerOrOptions?.maxBufferedEvents ?? this.#maxBufferedEvents;
    signal?.throwIfAborted();
    const bufferedEvents = [];
    const pullResolvers = [];
    const unsubscribe = this.subscribe(event, (payload) => {
      const resolver = pullResolvers.shift();
      if (resolver) {
        resolver[0]({ done: false, value: payload });
      } else {
        bufferedEvents.push(payload);
        if (bufferedEvents.length > maxBufferedEvents) {
          bufferedEvents.shift();
        }
      }
    });
    const abortListener = (event2) => {
      unsubscribe();
      pullResolvers.forEach((resolver) => resolver[1](event2.target.reason));
      pullResolvers.length = 0;
      bufferedEvents.length = 0;
    };
    signal?.addEventListener("abort", abortListener, { once: true });
    return new AsyncIteratorClass(async () => {
      if (signal?.aborted) {
        throw signal.reason;
      }
      if (bufferedEvents.length > 0) {
        return { done: false, value: bufferedEvents.shift() };
      }
      return new Promise((resolve, reject) => {
        pullResolvers.push([resolve, reject]);
      });
    }, async () => {
      unsubscribe();
      signal?.removeEventListener("abort", abortListener);
      pullResolvers.forEach((resolver) => resolver[0]({ done: true, value: undefined }));
      pullResolvers.length = 0;
      bufferedEvents.length = 0;
    });
  }
}

class SequentialIdGenerator {
  index = BigInt(1);
  generate() {
    const id = this.index.toString(36);
    this.index++;
    return id;
  }
}
function intercept(interceptors, options, main) {
  const next = (options2, index) => {
    const interceptor = interceptors[index];
    if (!interceptor) {
      return main(options2);
    }
    return interceptor({
      ...options2,
      next: (newOptions = options2) => next(newOptions, index + 1)
    });
  };
  return next(options, 0);
}
function stringifyJSON(value) {
  return JSON.stringify(value);
}
function getConstructor(value) {
  if (!isTypescriptObject(value)) {
    return null;
  }
  return Object.getPrototypeOf(value)?.constructor;
}
function isObject(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || !proto || !proto.constructor;
}
function isTypescriptObject(value) {
  return !!value && (typeof value === "object" || typeof value === "function");
}
function clone(value) {
  if (Array.isArray(value)) {
    return value.map(clone);
  }
  if (isObject(value)) {
    const result = {};
    for (const key in value) {
      result[key] = clone(value[key]);
    }
    for (const sym of Object.getOwnPropertySymbols(value)) {
      result[sym] = clone(value[sym]);
    }
    return result;
  }
  return value;
}
function value(value2, ...args) {
  if (typeof value2 === "function") {
    return value2(...args);
  }
  return value2;
}
function preventNativeAwait(target) {
  return new Proxy(target, {
    get(target2, prop, receiver) {
      const value2 = Reflect.get(target2, prop, receiver);
      if (prop !== "then" || typeof value2 !== "function") {
        return value2;
      }
      return new Proxy(value2, {
        apply(targetFn, thisArg, args) {
          if (args.length !== 2 || args.some((arg) => !isNativeFunction(arg))) {
            return Reflect.apply(targetFn, thisArg, args);
          }
          let shouldOmit = true;
          args[0].call(thisArg, preventNativeAwait(new Proxy(target2, {
            get: (target3, prop2, receiver2) => {
              if (shouldOmit && prop2 === "then") {
                shouldOmit = false;
                return;
              }
              return Reflect.get(target3, prop2, receiver2);
            }
          })));
        }
      });
    }
  });
}
var NATIVE_FUNCTION_REGEX = /^\s*function\s*\(\)\s*\{\s*\[native code\]\s*\}\s*$/;
function isNativeFunction(fn) {
  return typeof fn === "function" && NATIVE_FUNCTION_REGEX.test(fn.toString());
}
function tryDecodeURIComponent(value2) {
  try {
    return decodeURIComponent(value2);
  } catch {
    return value2;
  }
}
// node_modules/@orpc/client/dist/shared/client.BKHdcV-f.mjs
var ORPC_CLIENT_PACKAGE_NAME = "@orpc/client";
var ORPC_CLIENT_PACKAGE_VERSION = "1.13.6";
var COMMON_ORPC_ERROR_DEFS = {
  BAD_REQUEST: {
    status: 400,
    message: "Bad Request"
  },
  UNAUTHORIZED: {
    status: 401,
    message: "Unauthorized"
  },
  FORBIDDEN: {
    status: 403,
    message: "Forbidden"
  },
  NOT_FOUND: {
    status: 404,
    message: "Not Found"
  },
  METHOD_NOT_SUPPORTED: {
    status: 405,
    message: "Method Not Supported"
  },
  NOT_ACCEPTABLE: {
    status: 406,
    message: "Not Acceptable"
  },
  TIMEOUT: {
    status: 408,
    message: "Request Timeout"
  },
  CONFLICT: {
    status: 409,
    message: "Conflict"
  },
  PRECONDITION_FAILED: {
    status: 412,
    message: "Precondition Failed"
  },
  PAYLOAD_TOO_LARGE: {
    status: 413,
    message: "Payload Too Large"
  },
  UNSUPPORTED_MEDIA_TYPE: {
    status: 415,
    message: "Unsupported Media Type"
  },
  UNPROCESSABLE_CONTENT: {
    status: 422,
    message: "Unprocessable Content"
  },
  TOO_MANY_REQUESTS: {
    status: 429,
    message: "Too Many Requests"
  },
  CLIENT_CLOSED_REQUEST: {
    status: 499,
    message: "Client Closed Request"
  },
  INTERNAL_SERVER_ERROR: {
    status: 500,
    message: "Internal Server Error"
  },
  NOT_IMPLEMENTED: {
    status: 501,
    message: "Not Implemented"
  },
  BAD_GATEWAY: {
    status: 502,
    message: "Bad Gateway"
  },
  SERVICE_UNAVAILABLE: {
    status: 503,
    message: "Service Unavailable"
  },
  GATEWAY_TIMEOUT: {
    status: 504,
    message: "Gateway Timeout"
  }
};
function fallbackORPCErrorStatus(code, status) {
  return status ?? COMMON_ORPC_ERROR_DEFS[code]?.status ?? 500;
}
function fallbackORPCErrorMessage(code, message) {
  return message || COMMON_ORPC_ERROR_DEFS[code]?.message || code;
}
var GLOBAL_ORPC_ERROR_CONSTRUCTORS_SYMBOL = Symbol.for(`__${ORPC_CLIENT_PACKAGE_NAME}@${ORPC_CLIENT_PACKAGE_VERSION}/error/ORPC_ERROR_CONSTRUCTORS__`);
globalThis[GLOBAL_ORPC_ERROR_CONSTRUCTORS_SYMBOL] ??= /* @__PURE__ */ new WeakSet;
var globalORPCErrorConstructors = globalThis[GLOBAL_ORPC_ERROR_CONSTRUCTORS_SYMBOL];

class ORPCError extends Error {
  defined;
  code;
  status;
  data;
  constructor(code, ...rest) {
    const options = resolveMaybeOptionalOptions(rest);
    if (options.status !== undefined && !isORPCErrorStatus(options.status)) {
      throw new Error("[ORPCError] Invalid error status code.");
    }
    const message = fallbackORPCErrorMessage(code, options.message);
    super(message, options);
    this.code = code;
    this.status = fallbackORPCErrorStatus(code, options.status);
    this.defined = options.defined ?? false;
    this.data = options.data;
  }
  toJSON() {
    return {
      defined: this.defined,
      code: this.code,
      status: this.status,
      message: this.message,
      data: this.data
    };
  }
  static [Symbol.hasInstance](instance) {
    if (globalORPCErrorConstructors.has(this)) {
      const constructor = getConstructor(instance);
      if (constructor && globalORPCErrorConstructors.has(constructor)) {
        return true;
      }
    }
    return super[Symbol.hasInstance](instance);
  }
}
globalORPCErrorConstructors.add(ORPCError);
function toORPCError(error) {
  return error instanceof ORPCError ? error : new ORPCError("INTERNAL_SERVER_ERROR", {
    message: "Internal server error",
    cause: error
  });
}
function isORPCErrorStatus(status) {
  return status < 200 || status >= 400;
}
function isORPCErrorJson(json) {
  if (!isObject(json)) {
    return false;
  }
  const validKeys = ["defined", "code", "status", "message", "data"];
  if (Object.keys(json).some((k) => !validKeys.includes(k))) {
    return false;
  }
  return "defined" in json && typeof json.defined === "boolean" && "code" in json && typeof json.code === "string" && "status" in json && typeof json.status === "number" && isORPCErrorStatus(json.status) && "message" in json && typeof json.message === "string";
}
function createORPCErrorFromJson(json, options = {}) {
  return new ORPCError(json.code, {
    ...options,
    ...json
  });
}
// node_modules/@orpc/standard-server/dist/index.mjs
class EventEncoderError extends TypeError {
}

class EventDecoderError extends TypeError {
}

class ErrorEvent extends Error {
  data;
  constructor(options) {
    super(options?.message ?? "An error event was received", options);
    this.data = options?.data;
  }
}
function decodeEventMessage(encoded) {
  const lines = encoded.replace(/\n+$/, "").split(/\n/);
  const message = {
    data: undefined,
    event: undefined,
    id: undefined,
    retry: undefined,
    comments: []
  };
  for (const line of lines) {
    const index = line.indexOf(":");
    const key = index === -1 ? line : line.slice(0, index);
    const value2 = index === -1 ? "" : line.slice(index + 1).replace(/^\s/, "");
    if (index === 0) {
      message.comments.push(value2);
    } else if (key === "data") {
      message.data ??= "";
      message.data += `${value2}
`;
    } else if (key === "event") {
      message.event = value2;
    } else if (key === "id") {
      message.id = value2;
    } else if (key === "retry") {
      const maybeInteger = Number.parseInt(value2);
      if (Number.isInteger(maybeInteger) && maybeInteger >= 0 && maybeInteger.toString() === value2) {
        message.retry = maybeInteger;
      }
    }
  }
  message.data = message.data?.replace(/\n$/, "");
  return message;
}

class EventDecoder {
  constructor(options = {}) {
    this.options = options;
  }
  incomplete = "";
  feed(chunk) {
    this.incomplete += chunk;
    const lastCompleteIndex = this.incomplete.lastIndexOf(`

`);
    if (lastCompleteIndex === -1) {
      return;
    }
    const completes = this.incomplete.slice(0, lastCompleteIndex).split(/\n\n/);
    this.incomplete = this.incomplete.slice(lastCompleteIndex + 2);
    for (const encoded of completes) {
      const message = decodeEventMessage(`${encoded}

`);
      if (this.options.onEvent) {
        this.options.onEvent(message);
      }
    }
  }
  end() {
    if (this.incomplete) {
      throw new EventDecoderError("Event Iterator ended before complete");
    }
  }
}

class EventDecoderStream extends TransformStream {
  constructor() {
    let decoder;
    super({
      start(controller) {
        decoder = new EventDecoder({
          onEvent: (event) => {
            controller.enqueue(event);
          }
        });
      },
      transform(chunk) {
        decoder.feed(chunk);
      },
      flush() {
        decoder.end();
      }
    });
  }
}
function assertEventId(id) {
  if (id.includes(`
`)) {
    throw new EventEncoderError("Event's id must not contain a newline character");
  }
}
function assertEventRetry(retry) {
  if (!Number.isInteger(retry) || retry < 0) {
    throw new EventEncoderError("Event's retry must be a integer and >= 0");
  }
}
function assertEventComment(comment) {
  if (comment.includes(`
`)) {
    throw new EventEncoderError("Event's comment must not contain a newline character");
  }
}
var EVENT_SOURCE_META_SYMBOL = Symbol("ORPC_EVENT_SOURCE_META");
function withEventMeta(container, meta) {
  if (meta.id === undefined && meta.retry === undefined && !meta.comments?.length) {
    return container;
  }
  if (meta.id !== undefined) {
    assertEventId(meta.id);
  }
  if (meta.retry !== undefined) {
    assertEventRetry(meta.retry);
  }
  if (meta.comments !== undefined) {
    for (const comment of meta.comments) {
      assertEventComment(comment);
    }
  }
  return new Proxy(container, {
    get(target, prop, receiver) {
      if (prop === EVENT_SOURCE_META_SYMBOL) {
        return meta;
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}
function getEventMeta(container) {
  return isTypescriptObject(container) ? Reflect.get(container, EVENT_SOURCE_META_SYMBOL) : undefined;
}

class HibernationEventIterator extends AsyncIteratorClass {
  hibernationCallback;
  constructor(hibernationCallback) {
    super(async () => {
      throw new Error("Cannot iterate over hibernating iterator directly");
    }, async (reason) => {
      if (reason !== "next") {
        throw new Error("Cannot cleanup hibernating iterator directly");
      }
    });
    this.hibernationCallback = hibernationCallback;
  }
}
function generateContentDisposition(filename) {
  const escapedFileName = filename.replace(/"/g, "\\\"");
  const encodedFilenameStar = encodeURIComponent(filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`).replace(/%(7C|60|5E)/g, (str, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
  return `inline; filename="${escapedFileName}"; filename*=utf-8''${encodedFilenameStar}`;
}
function getFilenameFromContentDisposition(contentDisposition) {
  const encodedFilenameStarMatch = contentDisposition.match(/filename\*=(UTF-8'')?([^;]*)/i);
  if (encodedFilenameStarMatch && typeof encodedFilenameStarMatch[2] === "string") {
    return tryDecodeURIComponent(encodedFilenameStarMatch[2]);
  }
  const encodedFilenameMatch = contentDisposition.match(/filename="((?:\\"|[^"])*)"/i);
  if (encodedFilenameMatch && typeof encodedFilenameMatch[1] === "string") {
    return encodedFilenameMatch[1].replace(/\\"/g, '"');
  }
}
function mergeStandardHeaders(a, b) {
  const merged = { ...a };
  for (const key in b) {
    if (Array.isArray(b[key])) {
      merged[key] = [...toArray(merged[key]), ...b[key]];
    } else if (b[key] !== undefined) {
      if (Array.isArray(merged[key])) {
        merged[key] = [...merged[key], b[key]];
      } else if (merged[key] !== undefined) {
        merged[key] = [merged[key], b[key]];
      } else {
        merged[key] = b[key];
      }
    }
  }
  return merged;
}
function flattenHeader(header) {
  if (typeof header === "string" || header === undefined) {
    return header;
  }
  if (header.length === 0) {
    return;
  }
  return header.join(", ");
}
function isEventIteratorHeaders(headers) {
  return Boolean(flattenHeader(headers["content-type"])?.startsWith("text/event-stream") && flattenHeader(headers["content-disposition"]) === undefined);
}

// node_modules/@orpc/client/dist/shared/client.BLtwTQUg.mjs
function mapEventIterator(iterator, maps) {
  const mapError = async (error) => {
    let mappedError = await maps.error(error);
    if (mappedError !== error) {
      const meta = getEventMeta(error);
      if (meta && isTypescriptObject(mappedError)) {
        mappedError = withEventMeta(mappedError, meta);
      }
    }
    return mappedError;
  };
  return new AsyncIteratorClass(async () => {
    const { done, value: value2 } = await (async () => {
      try {
        return await iterator.next();
      } catch (error) {
        throw await mapError(error);
      }
    })();
    let mappedValue = await maps.value(value2, done);
    if (mappedValue !== value2) {
      const meta = getEventMeta(value2);
      if (meta && isTypescriptObject(mappedValue)) {
        mappedValue = withEventMeta(mappedValue, meta);
      }
    }
    return { done, value: mappedValue };
  }, async () => {
    try {
      await iterator.return?.();
    } catch (error) {
      throw await mapError(error);
    }
  });
}
// node_modules/@orpc/client/dist/index.mjs
function resolveFriendlyClientOptions(options) {
  return {
    ...options,
    context: options.context ?? {}
  };
}
function createORPCClient(link, options = {}) {
  const path = options.path ?? [];
  const procedureClient = async (...[input, options2 = {}]) => {
    return await link.call(path, input, resolveFriendlyClientOptions(options2));
  };
  const recursive = new Proxy(procedureClient, {
    get(target, key) {
      if (typeof key !== "string") {
        return Reflect.get(target, key);
      }
      return createORPCClient(link, {
        ...options,
        path: [...path, key]
      });
    }
  });
  return preventNativeAwait(recursive);
}

// node_modules/@orpc/standard-server-peer/dist/index.mjs
var SHORTABLE_ORIGIN_MATCHER = /^http:\/\/orpc\//;
var MessageType = /* @__PURE__ */ ((MessageType2) => {
  MessageType2[MessageType2["REQUEST"] = 1] = "REQUEST";
  MessageType2[MessageType2["RESPONSE"] = 2] = "RESPONSE";
  MessageType2[MessageType2["EVENT_ITERATOR"] = 3] = "EVENT_ITERATOR";
  MessageType2[MessageType2["ABORT_SIGNAL"] = 4] = "ABORT_SIGNAL";
  return MessageType2;
})(MessageType || {});
function serializeRequestMessage(id, type, payload) {
  if (type === 3) {
    const eventPayload = payload;
    const serializedPayload2 = {
      e: eventPayload.event,
      d: eventPayload.data,
      m: eventPayload.meta
    };
    return { i: id, t: type, p: serializedPayload2 };
  }
  if (type === 4) {
    return { i: id, t: type, p: payload };
  }
  const request = payload;
  const serializedPayload = {
    u: request.url.toString().replace(SHORTABLE_ORIGIN_MATCHER, "/"),
    b: request.body,
    h: Object.keys(request.headers).length > 0 ? request.headers : undefined,
    m: request.method === "POST" ? undefined : request.method
  };
  return {
    i: id,
    p: serializedPayload
  };
}
function deserializeResponseMessage(message) {
  const id = message.i;
  const type = message.t;
  if (type === 3) {
    const payload2 = message.p;
    return [id, type, { event: payload2.e, data: payload2.d, meta: payload2.m }];
  }
  if (type === 4) {
    return [id, type, message.p];
  }
  const payload = message.p;
  return [id, 2, {
    status: payload.s ?? 200,
    headers: payload.h ?? {},
    body: payload.b
  }];
}
async function encodeRequestMessage(id, type, payload) {
  if (type === 3 || type === 4) {
    return encodeRawMessage(serializeRequestMessage(id, type, payload));
  }
  const request = payload;
  const { body: processedBody, headers: processedHeaders } = await serializeBodyAndHeaders(request.body, request.headers);
  const modifiedRequest = {
    ...request,
    body: processedBody instanceof Blob ? undefined : processedBody,
    headers: processedHeaders
  };
  const baseMessage = serializeRequestMessage(id, 1, modifiedRequest);
  if (processedBody instanceof Blob) {
    return encodeRawMessage(baseMessage, processedBody);
  }
  return encodeRawMessage(baseMessage);
}
async function decodeResponseMessage(raw) {
  const { json: message, buffer } = await decodeRawMessage(raw);
  const [id, type, payload] = deserializeResponseMessage(message);
  if (type === 3 || type === 4) {
    return [id, type, payload];
  }
  const response = payload;
  const body = await deserializeBody(response.headers, response.body, buffer);
  return [id, type, { ...response, body }];
}
async function serializeBodyAndHeaders(body, originalHeaders) {
  const headers = { ...originalHeaders };
  const originalContentDisposition = headers["content-disposition"];
  delete headers["content-type"];
  delete headers["content-disposition"];
  if (body instanceof Blob) {
    headers["content-type"] = body.type;
    headers["content-disposition"] = originalContentDisposition ?? generateContentDisposition(body instanceof File ? body.name : "blob");
    return { body, headers };
  }
  if (body instanceof FormData) {
    const tempRes = new Response(body);
    headers["content-type"] = tempRes.headers.get("content-type");
    const formDataBlob = await tempRes.blob();
    return { body: formDataBlob, headers };
  }
  if (body instanceof URLSearchParams) {
    headers["content-type"] = "application/x-www-form-urlencoded";
    return { body: body.toString(), headers };
  }
  if (isAsyncIteratorObject(body)) {
    headers["content-type"] = "text/event-stream";
    return { body: undefined, headers };
  }
  return { body, headers };
}
async function deserializeBody(headers, body, buffer) {
  const contentType = flattenHeader(headers["content-type"]);
  const contentDisposition = flattenHeader(headers["content-disposition"]);
  if (typeof contentDisposition === "string") {
    const filename = getFilenameFromContentDisposition(contentDisposition) ?? "blob";
    return new File(buffer === undefined ? [] : [buffer], filename, { type: contentType });
  }
  if (contentType?.startsWith("multipart/form-data")) {
    const tempRes = new Response(buffer, { headers: { "content-type": contentType } });
    return tempRes.formData();
  }
  if (contentType?.startsWith("application/x-www-form-urlencoded") && typeof body === "string") {
    return new URLSearchParams(body);
  }
  return body;
}
var JSON_AND_BINARY_DELIMITER = 255;
async function encodeRawMessage(data, blob) {
  const json = stringifyJSON(data);
  if (blob === undefined || blob.size === 0) {
    return json;
  }
  return readAsBuffer(new Blob([
    new TextEncoder().encode(json),
    new Uint8Array([JSON_AND_BINARY_DELIMITER]),
    blob
  ]));
}
async function decodeRawMessage(raw) {
  if (typeof raw === "string") {
    return { json: JSON.parse(raw) };
  }
  const buffer = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
  const delimiterIndex = buffer.indexOf(JSON_AND_BINARY_DELIMITER);
  if (delimiterIndex === -1) {
    const jsonPart2 = new TextDecoder().decode(buffer);
    return { json: JSON.parse(jsonPart2) };
  }
  const jsonPart = new TextDecoder().decode(buffer.subarray(0, delimiterIndex));
  const bufferPart = buffer.subarray(delimiterIndex + 1);
  return {
    json: JSON.parse(jsonPart),
    buffer: bufferPart
  };
}
function toEventIterator(queue, id, cleanup, options = {}) {
  let span;
  return new AsyncIteratorClass(async () => {
    span ??= startSpan("consume_event_iterator_stream");
    try {
      const item = await runInSpanContext(span, () => queue.pull(id));
      switch (item.event) {
        case "message": {
          let data = item.data;
          if (item.meta && isTypescriptObject(data)) {
            data = withEventMeta(data, item.meta);
          }
          span?.addEvent("message");
          return { value: data, done: false };
        }
        case "error": {
          let error = new ErrorEvent({
            data: item.data
          });
          if (item.meta) {
            error = withEventMeta(error, item.meta);
          }
          span?.addEvent("error");
          throw error;
        }
        case "done": {
          let data = item.data;
          if (item.meta && isTypescriptObject(data)) {
            data = withEventMeta(data, item.meta);
          }
          span?.addEvent("done");
          return { value: data, done: true };
        }
      }
    } catch (e) {
      if (!(e instanceof ErrorEvent)) {
        setSpanError(span, e, options);
      }
      throw e;
    }
  }, async (reason) => {
    try {
      if (reason !== "next") {
        span?.addEvent("cancelled");
      }
      await runInSpanContext(span, () => cleanup(reason));
    } catch (e) {
      setSpanError(span, e, options);
      throw e;
    } finally {
      span?.end();
    }
  });
}
function resolveEventIterator(iterator, callback) {
  return runWithSpan({ name: "stream_event_iterator" }, async (span) => {
    while (true) {
      const payload = await (async () => {
        try {
          const { value: value2, done } = await iterator.next();
          if (done) {
            span?.addEvent("done");
            return { event: "done", data: value2, meta: getEventMeta(value2) };
          }
          span?.addEvent("message");
          return { event: "message", data: value2, meta: getEventMeta(value2) };
        } catch (err) {
          if (err instanceof ErrorEvent) {
            span?.addEvent("error");
            return {
              event: "error",
              data: err.data,
              meta: getEventMeta(err)
            };
          } else {
            try {
              await callback({ event: "error", data: undefined });
            } catch (err2) {
              setSpanError(span, err);
              throw err2;
            }
            throw err;
          }
        }
      })();
      let isInvokeCleanupFn = false;
      try {
        const direction = await callback(payload);
        if (payload.event === "done" || payload.event === "error") {
          return;
        }
        if (direction === "abort") {
          isInvokeCleanupFn = true;
          await iterator.return?.();
          return;
        }
      } catch (err) {
        if (!isInvokeCleanupFn) {
          try {
            await iterator.return?.();
          } catch (err2) {
            setSpanError(span, err);
            throw err2;
          }
        }
        throw err;
      }
    }
  });
}

class ClientPeer {
  peer;
  constructor(send) {
    this.peer = new experimental_ClientPeerWithoutCodec(async ([id, type, payload]) => {
      await send(await encodeRequestMessage(id, type, payload));
    });
  }
  get length() {
    return this.peer.length;
  }
  open(id) {
    return this.peer.open(id);
  }
  async request(request) {
    return this.peer.request(request);
  }
  async message(raw) {
    return this.peer.message(await decodeResponseMessage(raw));
  }
  close(options = {}) {
    return this.peer.close(options);
  }
}

class experimental_ClientPeerWithoutCodec {
  idGenerator = new SequentialIdGenerator;
  responseQueue = new AsyncIdQueue;
  serverEventIteratorQueue = new AsyncIdQueue;
  serverControllers = /* @__PURE__ */ new Map;
  cleanupFns = /* @__PURE__ */ new Map;
  send;
  constructor(send) {
    this.send = async (message) => {
      const id = message[0];
      if (this.serverControllers.has(id)) {
        await send(message);
      }
    };
  }
  get length() {
    return (+this.responseQueue.length + this.serverEventIteratorQueue.length + this.serverControllers.size + this.cleanupFns.size) / 4;
  }
  open(id) {
    this.serverEventIteratorQueue.open(id);
    this.responseQueue.open(id);
    const controller = new AbortController;
    this.serverControllers.set(id, controller);
    this.cleanupFns.set(id, []);
    return controller;
  }
  async request(request) {
    const signal = request.signal;
    return runWithSpan({ name: "send_peer_request", signal }, async () => {
      if (signal?.aborted) {
        throw signal.reason;
      }
      const id = this.idGenerator.generate();
      const serverController = this.open(id);
      try {
        const otelConfig = getGlobalOtelConfig();
        if (otelConfig) {
          const headers = clone(request.headers);
          otelConfig.propagation.inject(otelConfig.context.active(), headers);
          request = { ...request, headers };
        }
        await this.send([id, MessageType.REQUEST, request]);
        if (signal?.aborted) {
          await this.send([id, MessageType.ABORT_SIGNAL, undefined]);
          throw signal.reason;
        }
        let abortListener;
        signal?.addEventListener("abort", abortListener = async () => {
          await this.send([id, MessageType.ABORT_SIGNAL, undefined]);
          this.close({ id, reason: signal.reason });
        }, { once: true });
        this.cleanupFns.get(id)?.push(() => {
          signal?.removeEventListener("abort", abortListener);
        });
        if (isAsyncIteratorObject(request.body)) {
          const iterator = request.body;
          resolveEventIterator(iterator, async (payload) => {
            if (serverController.signal.aborted) {
              return "abort";
            }
            await this.send([id, MessageType.EVENT_ITERATOR, payload]);
            return "next";
          });
        }
        const response = await this.responseQueue.pull(id);
        if (isEventIteratorHeaders(response.headers)) {
          const iterator = toEventIterator(this.serverEventIteratorQueue, id, async (reason) => {
            try {
              if (reason !== "next") {
                await this.send([id, MessageType.ABORT_SIGNAL, undefined]);
              }
            } finally {
              this.close({ id });
            }
          }, { signal });
          return {
            ...response,
            body: iterator
          };
        }
        this.close({ id });
        return response;
      } catch (err) {
        this.close({ id, reason: err });
        throw err;
      }
    });
  }
  async message([id, type, payload]) {
    if (type === MessageType.ABORT_SIGNAL) {
      this.serverControllers.get(id)?.abort();
      return;
    }
    if (type === MessageType.EVENT_ITERATOR) {
      if (this.serverEventIteratorQueue.isOpen(id)) {
        this.serverEventIteratorQueue.push(id, payload);
      }
      return;
    }
    if (!this.responseQueue.isOpen(id)) {
      return;
    }
    this.responseQueue.push(id, payload);
  }
  close(options = {}) {
    if (options.id !== undefined) {
      this.serverControllers.get(options.id)?.abort(options.reason);
      this.serverControllers.delete(options.id);
      this.cleanupFns.get(options.id)?.forEach((fn) => fn());
      this.cleanupFns.delete(options.id);
    } else {
      this.serverControllers.forEach((c) => c.abort(options.reason));
      this.serverControllers.clear();
      this.cleanupFns.forEach((fns) => fns.forEach((fn) => fn()));
      this.cleanupFns.clear();
    }
    this.responseQueue.close(options);
    this.serverEventIteratorQueue.close(options);
  }
}
class experimental_ServerPeerWithoutCodec {
  clientEventIteratorQueue = new AsyncIdQueue;
  clientControllers = /* @__PURE__ */ new Map;
  send;
  constructor(send) {
    this.send = async (message) => {
      const id = message[0];
      if (this.clientControllers.has(id)) {
        await send(message);
      }
    };
  }
  get length() {
    return (this.clientEventIteratorQueue.length + this.clientControllers.size) / 2;
  }
  open(id) {
    this.clientEventIteratorQueue.open(id);
    const controller = new AbortController;
    this.clientControllers.set(id, controller);
    return controller;
  }
  async message([id, type, payload], handleRequest) {
    if (type === MessageType.ABORT_SIGNAL) {
      this.close({ id, reason: new AbortError("Client aborted the request") });
      return [id, undefined];
    }
    if (type === MessageType.EVENT_ITERATOR) {
      if (this.clientEventIteratorQueue.isOpen(id)) {
        this.clientEventIteratorQueue.push(id, payload);
      }
      return [id, undefined];
    }
    const clientController = this.open(id);
    const signal = clientController.signal;
    const request = {
      ...payload,
      signal,
      body: isEventIteratorHeaders(payload.headers) ? toEventIterator(this.clientEventIteratorQueue, id, async (reason) => {
        if (reason !== "next") {
          await this.send([id, MessageType.ABORT_SIGNAL, undefined]);
        }
      }, { signal }) : payload.body
    };
    if (handleRequest) {
      let context;
      const otelConfig = getGlobalOtelConfig();
      if (otelConfig) {
        context = otelConfig.propagation.extract(otelConfig.context.active(), request.headers);
      }
      await runWithSpan({ name: "receive_peer_request", context }, async () => {
        const response = await runWithSpan({ name: "handle_request" }, async () => {
          try {
            return await handleRequest(request);
          } catch (reason) {
            this.close({ id, reason, abort: false });
            throw reason;
          }
        });
        await runWithSpan({ name: "send_peer_response" }, () => this.response(id, response));
      });
    }
    return [id, request];
  }
  async response(id, response) {
    const signal = this.clientControllers.get(id)?.signal;
    if (!signal || signal.aborted) {
      return;
    }
    try {
      await this.send([id, MessageType.RESPONSE, response]);
      if (!signal.aborted && isAsyncIteratorObject(response.body)) {
        if (response.body instanceof HibernationEventIterator) {
          response.body.hibernationCallback?.(id);
        } else {
          const iterator = response.body;
          await resolveEventIterator(iterator, async (payload) => {
            if (signal.aborted) {
              return "abort";
            }
            await this.send([id, MessageType.EVENT_ITERATOR, payload]);
            return "next";
          });
        }
      }
      this.close({ id, abort: false });
    } catch (reason) {
      this.close({ id, reason, abort: false });
      throw reason;
    }
  }
  close({ abort = true, ...options } = {}) {
    if (options.id === undefined) {
      if (abort) {
        this.clientControllers.forEach((c) => c.abort(options.reason));
      }
      this.clientControllers.clear();
    } else {
      if (abort) {
        this.clientControllers.get(options.id)?.abort(options.reason);
      }
      this.clientControllers.delete(options.id);
    }
    this.clientEventIteratorQueue.close(options);
  }
}

// node_modules/@orpc/standard-server-fetch/dist/index.mjs
function toStandardHeaders(headers, standardHeaders = {}) {
  headers.forEach((value2, key) => {
    if (Array.isArray(standardHeaders[key])) {
      standardHeaders[key].push(value2);
    } else if (standardHeaders[key] !== undefined) {
      standardHeaders[key] = [standardHeaders[key], value2];
    } else {
      standardHeaders[key] = value2;
    }
  });
  return standardHeaders;
}

// node_modules/@orpc/client/dist/shared/client.vZdLqpTj.mjs
class CompositeStandardLinkPlugin {
  plugins;
  constructor(plugins = []) {
    this.plugins = [...plugins].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  init(options) {
    for (const plugin of this.plugins) {
      plugin.init?.(options);
    }
  }
}

class StandardLink {
  constructor(codec, sender, options = {}) {
    this.codec = codec;
    this.sender = sender;
    const plugin = new CompositeStandardLinkPlugin(options.plugins);
    plugin.init(options);
    this.interceptors = toArray(options.interceptors);
    this.clientInterceptors = toArray(options.clientInterceptors);
  }
  interceptors;
  clientInterceptors;
  call(path, input, options) {
    return runWithSpan({ name: `${ORPC_NAME}.${path.join("/")}`, signal: options.signal }, (span) => {
      span?.setAttribute("rpc.system", ORPC_NAME);
      span?.setAttribute("rpc.method", path.join("."));
      if (isAsyncIteratorObject(input)) {
        input = asyncIteratorWithSpan({ name: "consume_event_iterator_input", signal: options.signal }, input);
      }
      return intercept(this.interceptors, { ...options, path, input }, async ({ path: path2, input: input2, ...options2 }) => {
        const otelConfig = getGlobalOtelConfig();
        let otelContext;
        const currentSpan = otelConfig?.trace.getActiveSpan() ?? span;
        if (currentSpan && otelConfig) {
          otelContext = otelConfig?.trace.setSpan(otelConfig.context.active(), currentSpan);
        }
        const request = await runWithSpan({ name: "encode_request", context: otelContext }, () => this.codec.encode(path2, input2, options2));
        const response = await intercept(this.clientInterceptors, { ...options2, input: input2, path: path2, request }, ({ input: input3, path: path3, request: request2, ...options3 }) => {
          return runWithSpan({ name: "send_request", signal: options3.signal, context: otelContext }, () => this.sender.call(request2, options3, path3, input3));
        });
        const output = await runWithSpan({ name: "decode_response", context: otelContext }, () => this.codec.decode(response, options2, path2, input2));
        if (isAsyncIteratorObject(output)) {
          return asyncIteratorWithSpan({ name: "consume_event_iterator_output", signal: options2.signal }, output);
        }
        return output;
      });
    });
  }
}
var STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES = {
  BIGINT: 0,
  DATE: 1,
  NAN: 2,
  UNDEFINED: 3,
  URL: 4,
  REGEXP: 5,
  SET: 6,
  MAP: 7
};

class StandardRPCJsonSerializer {
  customSerializers;
  constructor(options = {}) {
    this.customSerializers = options.customJsonSerializers ?? [];
    if (this.customSerializers.length !== new Set(this.customSerializers.map((custom) => custom.type)).size) {
      throw new Error("Custom serializer type must be unique.");
    }
  }
  serialize(data, segments = [], meta = [], maps = [], blobs = []) {
    for (const custom of this.customSerializers) {
      if (custom.condition(data)) {
        const result = this.serialize(custom.serialize(data), segments, meta, maps, blobs);
        meta.push([custom.type, ...segments]);
        return result;
      }
    }
    if (data instanceof Blob) {
      maps.push(segments);
      blobs.push(data);
      return [data, meta, maps, blobs];
    }
    if (typeof data === "bigint") {
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.BIGINT, ...segments]);
      return [data.toString(), meta, maps, blobs];
    }
    if (data instanceof Date) {
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.DATE, ...segments]);
      if (Number.isNaN(data.getTime())) {
        return [null, meta, maps, blobs];
      }
      return [data.toISOString(), meta, maps, blobs];
    }
    if (Number.isNaN(data)) {
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.NAN, ...segments]);
      return [null, meta, maps, blobs];
    }
    if (data instanceof URL) {
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.URL, ...segments]);
      return [data.toString(), meta, maps, blobs];
    }
    if (data instanceof RegExp) {
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.REGEXP, ...segments]);
      return [data.toString(), meta, maps, blobs];
    }
    if (data instanceof Set) {
      const result = this.serialize(Array.from(data), segments, meta, maps, blobs);
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.SET, ...segments]);
      return result;
    }
    if (data instanceof Map) {
      const result = this.serialize(Array.from(data.entries()), segments, meta, maps, blobs);
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.MAP, ...segments]);
      return result;
    }
    if (Array.isArray(data)) {
      const json = data.map((v, i) => {
        if (v === undefined) {
          meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.UNDEFINED, ...segments, i]);
          return v;
        }
        return this.serialize(v, [...segments, i], meta, maps, blobs)[0];
      });
      return [json, meta, maps, blobs];
    }
    if (isObject(data)) {
      const json = {};
      for (const k in data) {
        if (k === "toJSON" && typeof data[k] === "function") {
          continue;
        }
        json[k] = this.serialize(data[k], [...segments, k], meta, maps, blobs)[0];
      }
      return [json, meta, maps, blobs];
    }
    return [data, meta, maps, blobs];
  }
  deserialize(json, meta, maps, getBlob) {
    const ref = { data: json };
    if (maps && getBlob) {
      maps.forEach((segments, i) => {
        let currentRef = ref;
        let preSegment = "data";
        segments.forEach((segment) => {
          currentRef = currentRef[preSegment];
          preSegment = segment;
          if (!Object.hasOwn(currentRef, preSegment)) {
            throw new Error(`Security error: accessing non-existent path during deserialization. Path segment: ${preSegment}`);
          }
        });
        currentRef[preSegment] = getBlob(i);
      });
    }
    for (const item of meta) {
      const type = item[0];
      let currentRef = ref;
      let preSegment = "data";
      for (let i = 1;i < item.length; i++) {
        currentRef = currentRef[preSegment];
        preSegment = item[i];
        if (!Object.hasOwn(currentRef, preSegment)) {
          throw new Error(`Security error: accessing non-existent path during deserialization. Path segment: ${preSegment}`);
        }
      }
      for (const custom of this.customSerializers) {
        if (custom.type === type) {
          currentRef[preSegment] = custom.deserialize(currentRef[preSegment]);
          break;
        }
      }
      switch (type) {
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.BIGINT:
          currentRef[preSegment] = BigInt(currentRef[preSegment]);
          break;
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.DATE:
          currentRef[preSegment] = new Date(currentRef[preSegment] ?? "Invalid Date");
          break;
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.NAN:
          currentRef[preSegment] = Number.NaN;
          break;
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.UNDEFINED:
          currentRef[preSegment] = undefined;
          break;
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.URL:
          currentRef[preSegment] = new URL(currentRef[preSegment]);
          break;
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.REGEXP: {
          const [, pattern, flags] = currentRef[preSegment].match(/^\/(.*)\/([a-z]*)$/);
          currentRef[preSegment] = new RegExp(pattern, flags);
          break;
        }
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.SET:
          currentRef[preSegment] = new Set(currentRef[preSegment]);
          break;
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.MAP:
          currentRef[preSegment] = new Map(currentRef[preSegment]);
          break;
      }
    }
    return ref.data;
  }
}
function toHttpPath(path) {
  return `/${path.map(encodeURIComponent).join("/")}`;
}
function toStandardHeaders2(headers) {
  if (typeof headers.forEach === "function") {
    return toStandardHeaders(headers);
  }
  return headers;
}
function getMalformedResponseErrorCode(status) {
  return Object.entries(COMMON_ORPC_ERROR_DEFS).find(([, def]) => def.status === status)?.[0] ?? "MALFORMED_ORPC_ERROR_RESPONSE";
}

class StandardRPCLinkCodec {
  constructor(serializer, options) {
    this.serializer = serializer;
    this.baseUrl = options.url;
    this.maxUrlLength = options.maxUrlLength ?? 2083;
    this.fallbackMethod = options.fallbackMethod ?? "POST";
    this.expectedMethod = options.method ?? this.fallbackMethod;
    this.headers = options.headers ?? {};
  }
  baseUrl;
  maxUrlLength;
  fallbackMethod;
  expectedMethod;
  headers;
  async encode(path, input, options) {
    let headers = toStandardHeaders2(await value(this.headers, options, path, input));
    if (options.lastEventId !== undefined) {
      headers = mergeStandardHeaders(headers, { "last-event-id": options.lastEventId });
    }
    const expectedMethod = await value(this.expectedMethod, options, path, input);
    const baseUrl = await value(this.baseUrl, options, path, input);
    const url = new URL(baseUrl);
    url.pathname = `${url.pathname.replace(/\/$/, "")}${toHttpPath(path)}`;
    const serialized = this.serializer.serialize(input);
    if (expectedMethod === "GET" && !(serialized instanceof FormData) && !isAsyncIteratorObject(serialized)) {
      const maxUrlLength = await value(this.maxUrlLength, options, path, input);
      const getUrl = new URL(url);
      getUrl.searchParams.append("data", stringifyJSON(serialized));
      if (getUrl.toString().length <= maxUrlLength) {
        return {
          body: undefined,
          method: expectedMethod,
          headers,
          url: getUrl,
          signal: options.signal
        };
      }
    }
    return {
      url,
      method: expectedMethod === "GET" ? this.fallbackMethod : expectedMethod,
      headers,
      body: serialized,
      signal: options.signal
    };
  }
  async decode(response) {
    const isOk = !isORPCErrorStatus(response.status);
    const deserialized = await (async () => {
      let isBodyOk = false;
      try {
        const body = await response.body();
        isBodyOk = true;
        return this.serializer.deserialize(body);
      } catch (error) {
        if (!isBodyOk) {
          throw new Error("Cannot parse response body, please check the response body and content-type.", {
            cause: error
          });
        }
        throw new Error("Invalid RPC response format.", {
          cause: error
        });
      }
    })();
    if (!isOk) {
      if (isORPCErrorJson(deserialized)) {
        throw createORPCErrorFromJson(deserialized);
      }
      throw new ORPCError(getMalformedResponseErrorCode(response.status), {
        status: response.status,
        data: { ...response, body: deserialized }
      });
    }
    return deserialized;
  }
}

class StandardRPCSerializer {
  constructor(jsonSerializer) {
    this.jsonSerializer = jsonSerializer;
  }
  serialize(data) {
    if (isAsyncIteratorObject(data)) {
      return mapEventIterator(data, {
        value: async (value2) => this.#serialize(value2, false),
        error: async (e) => {
          return new ErrorEvent({
            data: this.#serialize(toORPCError(e).toJSON(), false),
            cause: e
          });
        }
      });
    }
    return this.#serialize(data, true);
  }
  #serialize(data, enableFormData) {
    const [json, meta_, maps, blobs] = this.jsonSerializer.serialize(data);
    const meta = meta_.length === 0 ? undefined : meta_;
    if (!enableFormData || blobs.length === 0) {
      return {
        json,
        meta
      };
    }
    const form = new FormData;
    form.set("data", stringifyJSON({ json, meta, maps }));
    blobs.forEach((blob, i) => {
      form.set(i.toString(), blob);
    });
    return form;
  }
  deserialize(data) {
    if (isAsyncIteratorObject(data)) {
      return mapEventIterator(data, {
        value: async (value2) => this.#deserialize(value2),
        error: async (e) => {
          if (!(e instanceof ErrorEvent)) {
            return e;
          }
          const deserialized = this.#deserialize(e.data);
          if (isORPCErrorJson(deserialized)) {
            return createORPCErrorFromJson(deserialized, { cause: e });
          }
          return new ErrorEvent({
            data: deserialized,
            cause: e
          });
        }
      });
    }
    return this.#deserialize(data);
  }
  #deserialize(data) {
    if (data === undefined) {
      return;
    }
    if (!(data instanceof FormData)) {
      return this.jsonSerializer.deserialize(data.json, data.meta ?? []);
    }
    const serialized = JSON.parse(data.get("data"));
    return this.jsonSerializer.deserialize(serialized.json, serialized.meta ?? [], serialized.maps, (i) => data.get(i.toString()));
  }
}

class StandardRPCLink extends StandardLink {
  constructor(linkClient, options) {
    const jsonSerializer = new StandardRPCJsonSerializer(options);
    const serializer = new StandardRPCSerializer(jsonSerializer);
    const linkCodec = new StandardRPCLinkCodec(serializer, options);
    super(linkCodec, linkClient, options);
  }
}

// node_modules/@orpc/client/dist/adapters/websocket/index.mjs
var WEBSOCKET_CONNECTING = 0;

class LinkWebsocketClient {
  peer;
  constructor(options) {
    const untilOpen = new Promise((resolve) => {
      if (options.websocket.readyState === WEBSOCKET_CONNECTING) {
        options.websocket.addEventListener("open", () => {
          resolve();
        }, { once: true });
      } else {
        resolve();
      }
    });
    this.peer = new ClientPeer(async (message) => {
      await untilOpen;
      return options.websocket.send(message);
    });
    options.websocket.addEventListener("message", async (event) => {
      const message = event.data instanceof Blob ? await readAsBuffer(event.data) : event.data;
      this.peer.message(message);
    });
    options.websocket.addEventListener("close", () => {
      this.peer.close();
    });
  }
  async call(request, _options, _path, _input) {
    const response = await this.peer.request(request);
    return { ...response, body: () => Promise.resolve(response.body) };
  }
}

class RPCLink extends StandardRPCLink {
  constructor(options) {
    const linkClient = new LinkWebsocketClient(options);
    super(linkClient, { ...options, url: "http://orpc" });
  }
}

// src/orpc/client.ts
var websocket = new WebSocket("ws://localhost:3000");
var link = new RPCLink({
  websocket
});
var client = createORPCClient(link);

// src/guest.ts
var main = async () => {
  const decoder = new TextDecoder;
  while (true) {
    console.log("waiting for job...");
    const { data, error } = await tryCatch(client.requestJob());
    if (error) {
      console.error("Error:", error);
      await Bun.sleep(1000);
      continue;
    }
    const { jobType } = data;
    const result = await $`echo "${jobType}"`;
    const { data: submitData, error: submitErr } = await tryCatch(client.submitJob({
      exitCode: 230,
      stdout: decoder.decode(result.stdout),
      stderr: decoder.decode(result.stderr)
    }));
    if (submitErr) {
      console.error("Submit error: ", submitErr);
      await Bun.sleep(1000);
      continue;
    }
    const { action } = submitData;
    if (action === "die") {
      console.log("Shutting down...");
      process.exit(0);
    } else {
      console.log("Continuing...");
    }
    await Bun.sleep(1000);
    console.log("Finishing iteration...");
  }
};
await main();
