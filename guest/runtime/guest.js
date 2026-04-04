// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: __accessProp.bind(mod, key),
        enumerable: true
      });
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __require = import.meta.require;
var __using = (stack, value, async) => {
  if (value != null) {
    if (typeof value !== "object" && typeof value !== "function")
      throw TypeError('Object expected to be assigned to "using" declaration');
    let dispose;
    if (async)
      dispose = value[Symbol.asyncDispose];
    if (dispose === undefined)
      dispose = value[Symbol.dispose];
    if (typeof dispose !== "function")
      throw TypeError("Object not disposable");
    stack.push([async, dispose, value]);
  } else if (async) {
    stack.push([async]);
  }
  return value;
};
var __callDispose = (stack, error, hasError) => {
  let fail = (e) => error = hasError ? new SuppressedError(e, error, "An error was suppressed during disposal") : (hasError = true, e), next = (it) => {
    while (it = stack.pop()) {
      try {
        var result = it[1] && it[1].call(it[2]);
        if (it[0])
          return Promise.resolve(result).then(next, (e) => (fail(e), next()));
      } catch (e) {
        fail(e);
      }
    }
    if (hasError)
      throw error;
  };
  return next();
};

// node_modules/.bun/pino-std-serializers@7.1.0/node_modules/pino-std-serializers/lib/err-helpers.js
var require_err_helpers = __commonJS((exports, module) => {
  var isErrorLike = (err) => {
    return err && typeof err.message === "string";
  };
  var getErrorCause = (err) => {
    if (!err)
      return;
    const cause = err.cause;
    if (typeof cause === "function") {
      const causeResult = err.cause();
      return isErrorLike(causeResult) ? causeResult : undefined;
    } else {
      return isErrorLike(cause) ? cause : undefined;
    }
  };
  var _stackWithCauses = (err, seen) => {
    if (!isErrorLike(err))
      return "";
    const stack = err.stack || "";
    if (seen.has(err)) {
      return stack + `
causes have become circular...`;
    }
    const cause = getErrorCause(err);
    if (cause) {
      seen.add(err);
      return stack + `
caused by: ` + _stackWithCauses(cause, seen);
    } else {
      return stack;
    }
  };
  var stackWithCauses = (err) => _stackWithCauses(err, new Set);
  var _messageWithCauses = (err, seen, skip) => {
    if (!isErrorLike(err))
      return "";
    const message = skip ? "" : err.message || "";
    if (seen.has(err)) {
      return message + ": ...";
    }
    const cause = getErrorCause(err);
    if (cause) {
      seen.add(err);
      const skipIfVErrorStyleCause = typeof err.cause === "function";
      return message + (skipIfVErrorStyleCause ? "" : ": ") + _messageWithCauses(cause, seen, skipIfVErrorStyleCause);
    } else {
      return message;
    }
  };
  var messageWithCauses = (err) => _messageWithCauses(err, new Set);
  module.exports = {
    isErrorLike,
    getErrorCause,
    stackWithCauses,
    messageWithCauses
  };
});

// node_modules/.bun/pino-std-serializers@7.1.0/node_modules/pino-std-serializers/lib/err-proto.js
var require_err_proto = __commonJS((exports, module) => {
  var seen = Symbol("circular-ref-tag");
  var rawSymbol = Symbol("pino-raw-err-ref");
  var pinoErrProto = Object.create({}, {
    type: {
      enumerable: true,
      writable: true,
      value: undefined
    },
    message: {
      enumerable: true,
      writable: true,
      value: undefined
    },
    stack: {
      enumerable: true,
      writable: true,
      value: undefined
    },
    aggregateErrors: {
      enumerable: true,
      writable: true,
      value: undefined
    },
    raw: {
      enumerable: false,
      get: function() {
        return this[rawSymbol];
      },
      set: function(val) {
        this[rawSymbol] = val;
      }
    }
  });
  Object.defineProperty(pinoErrProto, rawSymbol, {
    writable: true,
    value: {}
  });
  module.exports = {
    pinoErrProto,
    pinoErrorSymbols: {
      seen,
      rawSymbol
    }
  };
});

// node_modules/.bun/pino-std-serializers@7.1.0/node_modules/pino-std-serializers/lib/err.js
var require_err = __commonJS((exports, module) => {
  module.exports = errSerializer;
  var { messageWithCauses, stackWithCauses, isErrorLike } = require_err_helpers();
  var { pinoErrProto, pinoErrorSymbols } = require_err_proto();
  var { seen } = pinoErrorSymbols;
  var { toString } = Object.prototype;
  function errSerializer(err) {
    if (!isErrorLike(err)) {
      return err;
    }
    err[seen] = undefined;
    const _err = Object.create(pinoErrProto);
    _err.type = toString.call(err.constructor) === "[object Function]" ? err.constructor.name : err.name;
    _err.message = messageWithCauses(err);
    _err.stack = stackWithCauses(err);
    if (Array.isArray(err.errors)) {
      _err.aggregateErrors = err.errors.map((err2) => errSerializer(err2));
    }
    for (const key in err) {
      if (_err[key] === undefined) {
        const val = err[key];
        if (isErrorLike(val)) {
          if (key !== "cause" && !Object.prototype.hasOwnProperty.call(val, seen)) {
            _err[key] = errSerializer(val);
          }
        } else {
          _err[key] = val;
        }
      }
    }
    delete err[seen];
    _err.raw = err;
    return _err;
  }
});

// node_modules/.bun/pino-std-serializers@7.1.0/node_modules/pino-std-serializers/lib/err-with-cause.js
var require_err_with_cause = __commonJS((exports, module) => {
  module.exports = errWithCauseSerializer;
  var { isErrorLike } = require_err_helpers();
  var { pinoErrProto, pinoErrorSymbols } = require_err_proto();
  var { seen } = pinoErrorSymbols;
  var { toString } = Object.prototype;
  function errWithCauseSerializer(err) {
    if (!isErrorLike(err)) {
      return err;
    }
    err[seen] = undefined;
    const _err = Object.create(pinoErrProto);
    _err.type = toString.call(err.constructor) === "[object Function]" ? err.constructor.name : err.name;
    _err.message = err.message;
    _err.stack = err.stack;
    if (Array.isArray(err.errors)) {
      _err.aggregateErrors = err.errors.map((err2) => errWithCauseSerializer(err2));
    }
    if (isErrorLike(err.cause) && !Object.prototype.hasOwnProperty.call(err.cause, seen)) {
      _err.cause = errWithCauseSerializer(err.cause);
    }
    for (const key in err) {
      if (_err[key] === undefined) {
        const val = err[key];
        if (isErrorLike(val)) {
          if (!Object.prototype.hasOwnProperty.call(val, seen)) {
            _err[key] = errWithCauseSerializer(val);
          }
        } else {
          _err[key] = val;
        }
      }
    }
    delete err[seen];
    _err.raw = err;
    return _err;
  }
});

// node_modules/.bun/pino-std-serializers@7.1.0/node_modules/pino-std-serializers/lib/req.js
var require_req = __commonJS((exports, module) => {
  module.exports = {
    mapHttpRequest,
    reqSerializer
  };
  var rawSymbol = Symbol("pino-raw-req-ref");
  var pinoReqProto = Object.create({}, {
    id: {
      enumerable: true,
      writable: true,
      value: ""
    },
    method: {
      enumerable: true,
      writable: true,
      value: ""
    },
    url: {
      enumerable: true,
      writable: true,
      value: ""
    },
    query: {
      enumerable: true,
      writable: true,
      value: ""
    },
    params: {
      enumerable: true,
      writable: true,
      value: ""
    },
    headers: {
      enumerable: true,
      writable: true,
      value: {}
    },
    remoteAddress: {
      enumerable: true,
      writable: true,
      value: ""
    },
    remotePort: {
      enumerable: true,
      writable: true,
      value: ""
    },
    raw: {
      enumerable: false,
      get: function() {
        return this[rawSymbol];
      },
      set: function(val) {
        this[rawSymbol] = val;
      }
    }
  });
  Object.defineProperty(pinoReqProto, rawSymbol, {
    writable: true,
    value: {}
  });
  function reqSerializer(req) {
    const connection = req.info || req.socket;
    const _req = Object.create(pinoReqProto);
    _req.id = typeof req.id === "function" ? req.id() : req.id || (req.info ? req.info.id : undefined);
    _req.method = req.method;
    if (req.originalUrl) {
      _req.url = req.originalUrl;
    } else {
      const path = req.path;
      _req.url = typeof path === "string" ? path : req.url ? req.url.path || req.url : undefined;
    }
    if (req.query) {
      _req.query = req.query;
    }
    if (req.params) {
      _req.params = req.params;
    }
    _req.headers = req.headers;
    _req.remoteAddress = connection && connection.remoteAddress;
    _req.remotePort = connection && connection.remotePort;
    _req.raw = req.raw || req;
    return _req;
  }
  function mapHttpRequest(req) {
    return {
      req: reqSerializer(req)
    };
  }
});

// node_modules/.bun/pino-std-serializers@7.1.0/node_modules/pino-std-serializers/lib/res.js
var require_res = __commonJS((exports, module) => {
  module.exports = {
    mapHttpResponse,
    resSerializer
  };
  var rawSymbol = Symbol("pino-raw-res-ref");
  var pinoResProto = Object.create({}, {
    statusCode: {
      enumerable: true,
      writable: true,
      value: 0
    },
    headers: {
      enumerable: true,
      writable: true,
      value: ""
    },
    raw: {
      enumerable: false,
      get: function() {
        return this[rawSymbol];
      },
      set: function(val) {
        this[rawSymbol] = val;
      }
    }
  });
  Object.defineProperty(pinoResProto, rawSymbol, {
    writable: true,
    value: {}
  });
  function resSerializer(res) {
    const _res = Object.create(pinoResProto);
    _res.statusCode = res.headersSent ? res.statusCode : null;
    _res.headers = res.getHeaders ? res.getHeaders() : res._headers;
    _res.raw = res;
    return _res;
  }
  function mapHttpResponse(res) {
    return {
      res: resSerializer(res)
    };
  }
});

// node_modules/.bun/pino-std-serializers@7.1.0/node_modules/pino-std-serializers/index.js
var require_pino_std_serializers = __commonJS((exports, module) => {
  var errSerializer = require_err();
  var errWithCauseSerializer = require_err_with_cause();
  var reqSerializers = require_req();
  var resSerializers = require_res();
  module.exports = {
    err: errSerializer,
    errWithCause: errWithCauseSerializer,
    mapHttpRequest: reqSerializers.mapHttpRequest,
    mapHttpResponse: resSerializers.mapHttpResponse,
    req: reqSerializers.reqSerializer,
    res: resSerializers.resSerializer,
    wrapErrorSerializer: function wrapErrorSerializer(customSerializer) {
      if (customSerializer === errSerializer)
        return customSerializer;
      return function wrapErrSerializer(err) {
        return customSerializer(errSerializer(err));
      };
    },
    wrapRequestSerializer: function wrapRequestSerializer(customSerializer) {
      if (customSerializer === reqSerializers.reqSerializer)
        return customSerializer;
      return function wrappedReqSerializer(req) {
        return customSerializer(reqSerializers.reqSerializer(req));
      };
    },
    wrapResponseSerializer: function wrapResponseSerializer(customSerializer) {
      if (customSerializer === resSerializers.resSerializer)
        return customSerializer;
      return function wrappedResSerializer(res) {
        return customSerializer(resSerializers.resSerializer(res));
      };
    }
  };
});

// node_modules/.bun/pino@10.3.1/node_modules/pino/lib/caller.js
var require_caller = __commonJS((exports, module) => {
  function noOpPrepareStackTrace(_, stack) {
    return stack;
  }
  module.exports = function getCallers() {
    const originalPrepare = Error.prepareStackTrace;
    Error.prepareStackTrace = noOpPrepareStackTrace;
    const stack = new Error().stack;
    Error.prepareStackTrace = originalPrepare;
    if (!Array.isArray(stack)) {
      return;
    }
    const entries = stack.slice(2);
    const fileNames = [];
    for (const entry of entries) {
      if (!entry) {
        continue;
      }
      fileNames.push(entry.getFileName());
    }
    return fileNames;
  };
});

// node_modules/.bun/@pinojs+redact@0.4.0/node_modules/@pinojs/redact/index.js
var require_redact = __commonJS((exports, module) => {
  function deepClone(obj) {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    if (obj instanceof Array) {
      const cloned = [];
      for (let i = 0;i < obj.length; i++) {
        cloned[i] = deepClone(obj[i]);
      }
      return cloned;
    }
    if (typeof obj === "object") {
      const cloned = Object.create(Object.getPrototypeOf(obj));
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          cloned[key] = deepClone(obj[key]);
        }
      }
      return cloned;
    }
    return obj;
  }
  function parsePath(path) {
    const parts = [];
    let current = "";
    let inBrackets = false;
    let inQuotes = false;
    let quoteChar = "";
    for (let i = 0;i < path.length; i++) {
      const char = path[i];
      if (!inBrackets && char === ".") {
        if (current) {
          parts.push(current);
          current = "";
        }
      } else if (char === "[") {
        if (current) {
          parts.push(current);
          current = "";
        }
        inBrackets = true;
      } else if (char === "]" && inBrackets) {
        parts.push(current);
        current = "";
        inBrackets = false;
        inQuotes = false;
      } else if ((char === '"' || char === "'") && inBrackets) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = "";
        } else {
          current += char;
        }
      } else {
        current += char;
      }
    }
    if (current) {
      parts.push(current);
    }
    return parts;
  }
  function setValue(obj, parts, value) {
    let current = obj;
    for (let i = 0;i < parts.length - 1; i++) {
      const key = parts[i];
      if (typeof current !== "object" || current === null || !(key in current)) {
        return false;
      }
      if (typeof current[key] !== "object" || current[key] === null) {
        return false;
      }
      current = current[key];
    }
    const lastKey = parts[parts.length - 1];
    if (lastKey === "*") {
      if (Array.isArray(current)) {
        for (let i = 0;i < current.length; i++) {
          current[i] = value;
        }
      } else if (typeof current === "object" && current !== null) {
        for (const key in current) {
          if (Object.prototype.hasOwnProperty.call(current, key)) {
            current[key] = value;
          }
        }
      }
    } else {
      if (typeof current === "object" && current !== null && lastKey in current && Object.prototype.hasOwnProperty.call(current, lastKey)) {
        current[lastKey] = value;
      }
    }
    return true;
  }
  function removeKey(obj, parts) {
    let current = obj;
    for (let i = 0;i < parts.length - 1; i++) {
      const key = parts[i];
      if (typeof current !== "object" || current === null || !(key in current)) {
        return false;
      }
      if (typeof current[key] !== "object" || current[key] === null) {
        return false;
      }
      current = current[key];
    }
    const lastKey = parts[parts.length - 1];
    if (lastKey === "*") {
      if (Array.isArray(current)) {
        for (let i = 0;i < current.length; i++) {
          current[i] = undefined;
        }
      } else if (typeof current === "object" && current !== null) {
        for (const key in current) {
          if (Object.prototype.hasOwnProperty.call(current, key)) {
            delete current[key];
          }
        }
      }
    } else {
      if (typeof current === "object" && current !== null && lastKey in current && Object.prototype.hasOwnProperty.call(current, lastKey)) {
        delete current[lastKey];
      }
    }
    return true;
  }
  var PATH_NOT_FOUND = Symbol("PATH_NOT_FOUND");
  function getValueIfExists(obj, parts) {
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) {
        return PATH_NOT_FOUND;
      }
      if (typeof current !== "object" || current === null) {
        return PATH_NOT_FOUND;
      }
      if (!(part in current)) {
        return PATH_NOT_FOUND;
      }
      current = current[part];
    }
    return current;
  }
  function getValue(obj, parts) {
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) {
        return;
      }
      if (typeof current !== "object" || current === null) {
        return;
      }
      current = current[part];
    }
    return current;
  }
  function redactPaths(obj, paths, censor, remove = false) {
    for (const path of paths) {
      const parts = parsePath(path);
      if (parts.includes("*")) {
        redactWildcardPath(obj, parts, censor, path, remove);
      } else {
        if (remove) {
          removeKey(obj, parts);
        } else {
          const value = getValueIfExists(obj, parts);
          if (value === PATH_NOT_FOUND) {
            continue;
          }
          const actualCensor = typeof censor === "function" ? censor(value, parts) : censor;
          setValue(obj, parts, actualCensor);
        }
      }
    }
  }
  function redactWildcardPath(obj, parts, censor, originalPath, remove = false) {
    const wildcardIndex = parts.indexOf("*");
    if (wildcardIndex === parts.length - 1) {
      const parentParts = parts.slice(0, -1);
      let current = obj;
      for (const part of parentParts) {
        if (current === null || current === undefined)
          return;
        if (typeof current !== "object" || current === null)
          return;
        current = current[part];
      }
      if (Array.isArray(current)) {
        if (remove) {
          for (let i = 0;i < current.length; i++) {
            current[i] = undefined;
          }
        } else {
          for (let i = 0;i < current.length; i++) {
            const indexPath = [...parentParts, i.toString()];
            const actualCensor = typeof censor === "function" ? censor(current[i], indexPath) : censor;
            current[i] = actualCensor;
          }
        }
      } else if (typeof current === "object" && current !== null) {
        if (remove) {
          const keysToDelete = [];
          for (const key in current) {
            if (Object.prototype.hasOwnProperty.call(current, key)) {
              keysToDelete.push(key);
            }
          }
          for (const key of keysToDelete) {
            delete current[key];
          }
        } else {
          for (const key in current) {
            const keyPath = [...parentParts, key];
            const actualCensor = typeof censor === "function" ? censor(current[key], keyPath) : censor;
            current[key] = actualCensor;
          }
        }
      }
    } else {
      redactIntermediateWildcard(obj, parts, censor, wildcardIndex, originalPath, remove);
    }
  }
  function redactIntermediateWildcard(obj, parts, censor, wildcardIndex, originalPath, remove = false) {
    const beforeWildcard = parts.slice(0, wildcardIndex);
    const afterWildcard = parts.slice(wildcardIndex + 1);
    const pathArray = [];
    function traverse(current, pathLength) {
      if (pathLength === beforeWildcard.length) {
        if (Array.isArray(current)) {
          for (let i = 0;i < current.length; i++) {
            pathArray[pathLength] = i.toString();
            traverse(current[i], pathLength + 1);
          }
        } else if (typeof current === "object" && current !== null) {
          for (const key in current) {
            pathArray[pathLength] = key;
            traverse(current[key], pathLength + 1);
          }
        }
      } else if (pathLength < beforeWildcard.length) {
        const nextKey = beforeWildcard[pathLength];
        if (current && typeof current === "object" && current !== null && nextKey in current) {
          pathArray[pathLength] = nextKey;
          traverse(current[nextKey], pathLength + 1);
        }
      } else {
        if (afterWildcard.includes("*")) {
          const wrappedCensor = typeof censor === "function" ? (value, path) => {
            const fullPath = [...pathArray.slice(0, pathLength), ...path];
            return censor(value, fullPath);
          } : censor;
          redactWildcardPath(current, afterWildcard, wrappedCensor, originalPath, remove);
        } else {
          if (remove) {
            removeKey(current, afterWildcard);
          } else {
            const actualCensor = typeof censor === "function" ? censor(getValue(current, afterWildcard), [...pathArray.slice(0, pathLength), ...afterWildcard]) : censor;
            setValue(current, afterWildcard, actualCensor);
          }
        }
      }
    }
    if (beforeWildcard.length === 0) {
      traverse(obj, 0);
    } else {
      let current = obj;
      for (let i = 0;i < beforeWildcard.length; i++) {
        const part = beforeWildcard[i];
        if (current === null || current === undefined)
          return;
        if (typeof current !== "object" || current === null)
          return;
        current = current[part];
        pathArray[i] = part;
      }
      if (current !== null && current !== undefined) {
        traverse(current, beforeWildcard.length);
      }
    }
  }
  function buildPathStructure(pathsToClone) {
    if (pathsToClone.length === 0) {
      return null;
    }
    const pathStructure = new Map;
    for (const path of pathsToClone) {
      const parts = parsePath(path);
      let current = pathStructure;
      for (let i = 0;i < parts.length; i++) {
        const part = parts[i];
        if (!current.has(part)) {
          current.set(part, new Map);
        }
        current = current.get(part);
      }
    }
    return pathStructure;
  }
  function selectiveClone(obj, pathStructure) {
    if (!pathStructure) {
      return obj;
    }
    function cloneSelectively(source, pathMap, depth = 0) {
      if (!pathMap || pathMap.size === 0) {
        return source;
      }
      if (source === null || typeof source !== "object") {
        return source;
      }
      if (source instanceof Date) {
        return new Date(source.getTime());
      }
      if (Array.isArray(source)) {
        const cloned2 = [];
        for (let i = 0;i < source.length; i++) {
          const indexStr = i.toString();
          if (pathMap.has(indexStr) || pathMap.has("*")) {
            cloned2[i] = cloneSelectively(source[i], pathMap.get(indexStr) || pathMap.get("*"));
          } else {
            cloned2[i] = source[i];
          }
        }
        return cloned2;
      }
      const cloned = Object.create(Object.getPrototypeOf(source));
      for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          if (pathMap.has(key) || pathMap.has("*")) {
            cloned[key] = cloneSelectively(source[key], pathMap.get(key) || pathMap.get("*"));
          } else {
            cloned[key] = source[key];
          }
        }
      }
      return cloned;
    }
    return cloneSelectively(obj, pathStructure);
  }
  function validatePath(path) {
    if (typeof path !== "string") {
      throw new Error("Paths must be (non-empty) strings");
    }
    if (path === "") {
      throw new Error("Invalid redaction path ()");
    }
    if (path.includes("..")) {
      throw new Error(`Invalid redaction path (${path})`);
    }
    if (path.includes(",")) {
      throw new Error(`Invalid redaction path (${path})`);
    }
    let bracketCount = 0;
    let inQuotes = false;
    let quoteChar = "";
    for (let i = 0;i < path.length; i++) {
      const char = path[i];
      if ((char === '"' || char === "'") && bracketCount > 0) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = "";
        }
      } else if (char === "[" && !inQuotes) {
        bracketCount++;
      } else if (char === "]" && !inQuotes) {
        bracketCount--;
        if (bracketCount < 0) {
          throw new Error(`Invalid redaction path (${path})`);
        }
      }
    }
    if (bracketCount !== 0) {
      throw new Error(`Invalid redaction path (${path})`);
    }
  }
  function validatePaths(paths) {
    if (!Array.isArray(paths)) {
      throw new TypeError("paths must be an array");
    }
    for (const path of paths) {
      validatePath(path);
    }
  }
  function slowRedact(options = {}) {
    const {
      paths = [],
      censor = "[REDACTED]",
      serialize = JSON.stringify,
      strict = true,
      remove = false
    } = options;
    validatePaths(paths);
    const pathStructure = buildPathStructure(paths);
    return function redact(obj) {
      if (strict && (obj === null || typeof obj !== "object")) {
        if (obj === null || obj === undefined) {
          return serialize ? serialize(obj) : obj;
        }
        if (typeof obj !== "object") {
          return serialize ? serialize(obj) : obj;
        }
      }
      const cloned = selectiveClone(obj, pathStructure);
      const original = obj;
      let actualCensor = censor;
      if (typeof censor === "function") {
        actualCensor = censor;
      }
      redactPaths(cloned, paths, actualCensor, remove);
      if (serialize === false) {
        cloned.restore = function() {
          return deepClone(original);
        };
        return cloned;
      }
      if (typeof serialize === "function") {
        return serialize(cloned);
      }
      return JSON.stringify(cloned);
    };
  }
  module.exports = slowRedact;
});

// node_modules/.bun/pino@10.3.1/node_modules/pino/lib/symbols.js
var require_symbols = __commonJS((exports, module) => {
  var setLevelSym = Symbol("pino.setLevel");
  var getLevelSym = Symbol("pino.getLevel");
  var levelValSym = Symbol("pino.levelVal");
  var levelCompSym = Symbol("pino.levelComp");
  var useLevelLabelsSym = Symbol("pino.useLevelLabels");
  var useOnlyCustomLevelsSym = Symbol("pino.useOnlyCustomLevels");
  var mixinSym = Symbol("pino.mixin");
  var lsCacheSym = Symbol("pino.lsCache");
  var chindingsSym = Symbol("pino.chindings");
  var asJsonSym = Symbol("pino.asJson");
  var writeSym = Symbol("pino.write");
  var redactFmtSym = Symbol("pino.redactFmt");
  var timeSym = Symbol("pino.time");
  var timeSliceIndexSym = Symbol("pino.timeSliceIndex");
  var streamSym = Symbol("pino.stream");
  var stringifySym = Symbol("pino.stringify");
  var stringifySafeSym = Symbol("pino.stringifySafe");
  var stringifiersSym = Symbol("pino.stringifiers");
  var endSym = Symbol("pino.end");
  var formatOptsSym = Symbol("pino.formatOpts");
  var messageKeySym = Symbol("pino.messageKey");
  var errorKeySym = Symbol("pino.errorKey");
  var nestedKeySym = Symbol("pino.nestedKey");
  var nestedKeyStrSym = Symbol("pino.nestedKeyStr");
  var mixinMergeStrategySym = Symbol("pino.mixinMergeStrategy");
  var msgPrefixSym = Symbol("pino.msgPrefix");
  var wildcardFirstSym = Symbol("pino.wildcardFirst");
  var serializersSym = Symbol.for("pino.serializers");
  var formattersSym = Symbol.for("pino.formatters");
  var hooksSym = Symbol.for("pino.hooks");
  var needsMetadataGsym = Symbol.for("pino.metadata");
  module.exports = {
    setLevelSym,
    getLevelSym,
    levelValSym,
    levelCompSym,
    useLevelLabelsSym,
    mixinSym,
    lsCacheSym,
    chindingsSym,
    asJsonSym,
    writeSym,
    serializersSym,
    redactFmtSym,
    timeSym,
    timeSliceIndexSym,
    streamSym,
    stringifySym,
    stringifySafeSym,
    stringifiersSym,
    endSym,
    formatOptsSym,
    messageKeySym,
    errorKeySym,
    nestedKeySym,
    wildcardFirstSym,
    needsMetadataGsym,
    useOnlyCustomLevelsSym,
    formattersSym,
    hooksSym,
    nestedKeyStrSym,
    mixinMergeStrategySym,
    msgPrefixSym
  };
});

// node_modules/.bun/pino@10.3.1/node_modules/pino/lib/redaction.js
var require_redaction = __commonJS((exports, module) => {
  var Redact = require_redact();
  var { redactFmtSym, wildcardFirstSym } = require_symbols();
  var rx = /[^.[\]]+|\[([^[\]]*?)\]/g;
  var CENSOR = "[Redacted]";
  var strict = false;
  function redaction(opts, serialize) {
    const { paths, censor, remove } = handle(opts);
    const shape = paths.reduce((o, str) => {
      rx.lastIndex = 0;
      const first = rx.exec(str);
      const next = rx.exec(str);
      let ns = first[1] !== undefined ? first[1].replace(/^(?:"|'|`)(.*)(?:"|'|`)$/, "$1") : first[0];
      if (ns === "*") {
        ns = wildcardFirstSym;
      }
      if (next === null) {
        o[ns] = null;
        return o;
      }
      if (o[ns] === null) {
        return o;
      }
      const { index } = next;
      const nextPath = `${str.substr(index, str.length - 1)}`;
      o[ns] = o[ns] || [];
      if (ns !== wildcardFirstSym && o[ns].length === 0) {
        o[ns].push(...o[wildcardFirstSym] || []);
      }
      if (ns === wildcardFirstSym) {
        Object.keys(o).forEach(function(k) {
          if (o[k]) {
            o[k].push(nextPath);
          }
        });
      }
      o[ns].push(nextPath);
      return o;
    }, {});
    const result = {
      [redactFmtSym]: Redact({ paths, censor, serialize, strict, remove })
    };
    const topCensor = (...args) => {
      return typeof censor === "function" ? serialize(censor(...args)) : serialize(censor);
    };
    return [...Object.keys(shape), ...Object.getOwnPropertySymbols(shape)].reduce((o, k) => {
      if (shape[k] === null) {
        o[k] = (value) => topCensor(value, [k]);
      } else {
        const wrappedCensor = typeof censor === "function" ? (value, path) => {
          return censor(value, [k, ...path]);
        } : censor;
        o[k] = Redact({
          paths: shape[k],
          censor: wrappedCensor,
          serialize,
          strict,
          remove
        });
      }
      return o;
    }, result);
  }
  function handle(opts) {
    if (Array.isArray(opts)) {
      opts = { paths: opts, censor: CENSOR };
      return opts;
    }
    let { paths, censor = CENSOR, remove } = opts;
    if (Array.isArray(paths) === false) {
      throw Error("pino \u2013 redact must contain an array of strings");
    }
    if (remove === true)
      censor = undefined;
    return { paths, censor, remove };
  }
  module.exports = redaction;
});

// node_modules/.bun/pino@10.3.1/node_modules/pino/lib/time.js
var require_time = __commonJS((exports, module) => {
  var nullTime = () => "";
  var epochTime = () => `,"time":${Date.now()}`;
  var unixTime = () => `,"time":${Math.round(Date.now() / 1000)}`;
  var isoTime = () => `,"time":"${new Date(Date.now()).toISOString()}"`;
  var NS_PER_MS = 1000000n;
  var NS_PER_SEC = 1000000000n;
  var startWallTimeNs = BigInt(Date.now()) * NS_PER_MS;
  var startHrTime = process.hrtime.bigint();
  var isoTimeNano = () => {
    const elapsedNs = process.hrtime.bigint() - startHrTime;
    const currentTimeNs = startWallTimeNs + elapsedNs;
    const secondsSinceEpoch = currentTimeNs / NS_PER_SEC;
    const nanosWithinSecond = currentTimeNs % NS_PER_SEC;
    const msSinceEpoch = Number(secondsSinceEpoch * 1000n + nanosWithinSecond / 1000000n);
    const date = new Date(msSinceEpoch);
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const day = date.getUTCDate().toString().padStart(2, "0");
    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    const seconds = date.getUTCSeconds().toString().padStart(2, "0");
    return `,"time":"${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${nanosWithinSecond.toString().padStart(9, "0")}Z"`;
  };
  module.exports = { nullTime, epochTime, unixTime, isoTime, isoTimeNano };
});

// node_modules/.bun/quick-format-unescaped@4.0.4/node_modules/quick-format-unescaped/index.js
var require_quick_format_unescaped = __commonJS((exports, module) => {
  function tryStringify(o) {
    try {
      return JSON.stringify(o);
    } catch (e) {
      return '"[Circular]"';
    }
  }
  module.exports = format;
  function format(f, args, opts) {
    var ss = opts && opts.stringify || tryStringify;
    var offset = 1;
    if (typeof f === "object" && f !== null) {
      var len = args.length + offset;
      if (len === 1)
        return f;
      var objects = new Array(len);
      objects[0] = ss(f);
      for (var index = 1;index < len; index++) {
        objects[index] = ss(args[index]);
      }
      return objects.join(" ");
    }
    if (typeof f !== "string") {
      return f;
    }
    var argLen = args.length;
    if (argLen === 0)
      return f;
    var str = "";
    var a = 1 - offset;
    var lastPos = -1;
    var flen = f && f.length || 0;
    for (var i = 0;i < flen; ) {
      if (f.charCodeAt(i) === 37 && i + 1 < flen) {
        lastPos = lastPos > -1 ? lastPos : 0;
        switch (f.charCodeAt(i + 1)) {
          case 100:
          case 102:
            if (a >= argLen)
              break;
            if (args[a] == null)
              break;
            if (lastPos < i)
              str += f.slice(lastPos, i);
            str += Number(args[a]);
            lastPos = i + 2;
            i++;
            break;
          case 105:
            if (a >= argLen)
              break;
            if (args[a] == null)
              break;
            if (lastPos < i)
              str += f.slice(lastPos, i);
            str += Math.floor(Number(args[a]));
            lastPos = i + 2;
            i++;
            break;
          case 79:
          case 111:
          case 106:
            if (a >= argLen)
              break;
            if (args[a] === undefined)
              break;
            if (lastPos < i)
              str += f.slice(lastPos, i);
            var type = typeof args[a];
            if (type === "string") {
              str += "'" + args[a] + "'";
              lastPos = i + 2;
              i++;
              break;
            }
            if (type === "function") {
              str += args[a].name || "<anonymous>";
              lastPos = i + 2;
              i++;
              break;
            }
            str += ss(args[a]);
            lastPos = i + 2;
            i++;
            break;
          case 115:
            if (a >= argLen)
              break;
            if (lastPos < i)
              str += f.slice(lastPos, i);
            str += String(args[a]);
            lastPos = i + 2;
            i++;
            break;
          case 37:
            if (lastPos < i)
              str += f.slice(lastPos, i);
            str += "%";
            lastPos = i + 2;
            i++;
            a--;
            break;
        }
        ++a;
      }
      ++i;
    }
    if (lastPos === -1)
      return f;
    else if (lastPos < flen) {
      str += f.slice(lastPos);
    }
    return str;
  }
});

// node_modules/.bun/atomic-sleep@1.0.0/node_modules/atomic-sleep/index.js
var require_atomic_sleep = __commonJS((exports, module) => {
  if (typeof SharedArrayBuffer !== "undefined" && typeof Atomics !== "undefined") {
    let sleep = function(ms) {
      const valid = ms > 0 && ms < Infinity;
      if (valid === false) {
        if (typeof ms !== "number" && typeof ms !== "bigint") {
          throw TypeError("sleep: ms must be a number");
        }
        throw RangeError("sleep: ms must be a number that is greater than 0 but less than Infinity");
      }
      Atomics.wait(nil, 0, 0, Number(ms));
    };
    const nil = new Int32Array(new SharedArrayBuffer(4));
    module.exports = sleep;
  } else {
    let sleep = function(ms) {
      const valid = ms > 0 && ms < Infinity;
      if (valid === false) {
        if (typeof ms !== "number" && typeof ms !== "bigint") {
          throw TypeError("sleep: ms must be a number");
        }
        throw RangeError("sleep: ms must be a number that is greater than 0 but less than Infinity");
      }
      const target = Date.now() + Number(ms);
      while (target > Date.now()) {}
    };
    module.exports = sleep;
  }
});

// node_modules/.bun/sonic-boom@4.2.1/node_modules/sonic-boom/index.js
var require_sonic_boom = __commonJS((exports, module) => {
  var fs = __require("fs");
  var EventEmitter = __require("events");
  var inherits = __require("util").inherits;
  var path = __require("path");
  var sleep = require_atomic_sleep();
  var assert = __require("assert");
  var BUSY_WRITE_TIMEOUT = 100;
  var kEmptyBuffer = Buffer.allocUnsafe(0);
  var MAX_WRITE = 16 * 1024;
  var kContentModeBuffer = "buffer";
  var kContentModeUtf8 = "utf8";
  var [major, minor] = (process.versions.node || "0.0").split(".").map(Number);
  var kCopyBuffer = major >= 22 && minor >= 7;
  function openFile(file, sonic) {
    sonic._opening = true;
    sonic._writing = true;
    sonic._asyncDrainScheduled = false;
    function fileOpened(err, fd) {
      if (err) {
        sonic._reopening = false;
        sonic._writing = false;
        sonic._opening = false;
        if (sonic.sync) {
          process.nextTick(() => {
            if (sonic.listenerCount("error") > 0) {
              sonic.emit("error", err);
            }
          });
        } else {
          sonic.emit("error", err);
        }
        return;
      }
      const reopening = sonic._reopening;
      sonic.fd = fd;
      sonic.file = file;
      sonic._reopening = false;
      sonic._opening = false;
      sonic._writing = false;
      if (sonic.sync) {
        process.nextTick(() => sonic.emit("ready"));
      } else {
        sonic.emit("ready");
      }
      if (sonic.destroyed) {
        return;
      }
      if (!sonic._writing && sonic._len > sonic.minLength || sonic._flushPending) {
        sonic._actualWrite();
      } else if (reopening) {
        process.nextTick(() => sonic.emit("drain"));
      }
    }
    const flags = sonic.append ? "a" : "w";
    const mode = sonic.mode;
    if (sonic.sync) {
      try {
        if (sonic.mkdir)
          fs.mkdirSync(path.dirname(file), { recursive: true });
        const fd = fs.openSync(file, flags, mode);
        fileOpened(null, fd);
      } catch (err) {
        fileOpened(err);
        throw err;
      }
    } else if (sonic.mkdir) {
      fs.mkdir(path.dirname(file), { recursive: true }, (err) => {
        if (err)
          return fileOpened(err);
        fs.open(file, flags, mode, fileOpened);
      });
    } else {
      fs.open(file, flags, mode, fileOpened);
    }
  }
  function SonicBoom(opts) {
    if (!(this instanceof SonicBoom)) {
      return new SonicBoom(opts);
    }
    let { fd, dest, minLength, maxLength, maxWrite, periodicFlush, sync, append = true, mkdir, retryEAGAIN, fsync, contentMode, mode } = opts || {};
    fd = fd || dest;
    this._len = 0;
    this.fd = -1;
    this._bufs = [];
    this._lens = [];
    this._writing = false;
    this._ending = false;
    this._reopening = false;
    this._asyncDrainScheduled = false;
    this._flushPending = false;
    this._hwm = Math.max(minLength || 0, 16387);
    this.file = null;
    this.destroyed = false;
    this.minLength = minLength || 0;
    this.maxLength = maxLength || 0;
    this.maxWrite = maxWrite || MAX_WRITE;
    this._periodicFlush = periodicFlush || 0;
    this._periodicFlushTimer = undefined;
    this.sync = sync || false;
    this.writable = true;
    this._fsync = fsync || false;
    this.append = append || false;
    this.mode = mode;
    this.retryEAGAIN = retryEAGAIN || (() => true);
    this.mkdir = mkdir || false;
    let fsWriteSync;
    let fsWrite;
    if (contentMode === kContentModeBuffer) {
      this._writingBuf = kEmptyBuffer;
      this.write = writeBuffer;
      this.flush = flushBuffer;
      this.flushSync = flushBufferSync;
      this._actualWrite = actualWriteBuffer;
      fsWriteSync = () => fs.writeSync(this.fd, this._writingBuf);
      fsWrite = () => fs.write(this.fd, this._writingBuf, this.release);
    } else if (contentMode === undefined || contentMode === kContentModeUtf8) {
      this._writingBuf = "";
      this.write = write;
      this.flush = flush;
      this.flushSync = flushSync;
      this._actualWrite = actualWrite;
      fsWriteSync = () => {
        if (Buffer.isBuffer(this._writingBuf)) {
          return fs.writeSync(this.fd, this._writingBuf);
        }
        return fs.writeSync(this.fd, this._writingBuf, "utf8");
      };
      fsWrite = () => {
        if (Buffer.isBuffer(this._writingBuf)) {
          return fs.write(this.fd, this._writingBuf, this.release);
        }
        return fs.write(this.fd, this._writingBuf, "utf8", this.release);
      };
    } else {
      throw new Error(`SonicBoom supports "${kContentModeUtf8}" and "${kContentModeBuffer}", but passed ${contentMode}`);
    }
    if (typeof fd === "number") {
      this.fd = fd;
      process.nextTick(() => this.emit("ready"));
    } else if (typeof fd === "string") {
      openFile(fd, this);
    } else {
      throw new Error("SonicBoom supports only file descriptors and files");
    }
    if (this.minLength >= this.maxWrite) {
      throw new Error(`minLength should be smaller than maxWrite (${this.maxWrite})`);
    }
    this.release = (err, n) => {
      if (err) {
        if ((err.code === "EAGAIN" || err.code === "EBUSY") && this.retryEAGAIN(err, this._writingBuf.length, this._len - this._writingBuf.length)) {
          if (this.sync) {
            try {
              sleep(BUSY_WRITE_TIMEOUT);
              this.release(undefined, 0);
            } catch (err2) {
              this.release(err2);
            }
          } else {
            setTimeout(fsWrite, BUSY_WRITE_TIMEOUT);
          }
        } else {
          this._writing = false;
          this.emit("error", err);
        }
        return;
      }
      this.emit("write", n);
      const releasedBufObj = releaseWritingBuf(this._writingBuf, this._len, n);
      this._len = releasedBufObj.len;
      this._writingBuf = releasedBufObj.writingBuf;
      if (this._writingBuf.length) {
        if (!this.sync) {
          fsWrite();
          return;
        }
        try {
          do {
            const n2 = fsWriteSync();
            const releasedBufObj2 = releaseWritingBuf(this._writingBuf, this._len, n2);
            this._len = releasedBufObj2.len;
            this._writingBuf = releasedBufObj2.writingBuf;
          } while (this._writingBuf.length);
        } catch (err2) {
          this.release(err2);
          return;
        }
      }
      if (this._fsync) {
        fs.fsyncSync(this.fd);
      }
      const len = this._len;
      if (this._reopening) {
        this._writing = false;
        this._reopening = false;
        this.reopen();
      } else if (len > this.minLength) {
        this._actualWrite();
      } else if (this._ending) {
        if (len > 0) {
          this._actualWrite();
        } else {
          this._writing = false;
          actualClose(this);
        }
      } else {
        this._writing = false;
        if (this.sync) {
          if (!this._asyncDrainScheduled) {
            this._asyncDrainScheduled = true;
            process.nextTick(emitDrain, this);
          }
        } else {
          this.emit("drain");
        }
      }
    };
    this.on("newListener", function(name) {
      if (name === "drain") {
        this._asyncDrainScheduled = false;
      }
    });
    if (this._periodicFlush !== 0) {
      this._periodicFlushTimer = setInterval(() => this.flush(null), this._periodicFlush);
      this._periodicFlushTimer.unref();
    }
  }
  function releaseWritingBuf(writingBuf, len, n) {
    if (typeof writingBuf === "string") {
      writingBuf = Buffer.from(writingBuf);
    }
    len = Math.max(len - n, 0);
    writingBuf = writingBuf.subarray(n);
    return { writingBuf, len };
  }
  function emitDrain(sonic) {
    const hasListeners = sonic.listenerCount("drain") > 0;
    if (!hasListeners)
      return;
    sonic._asyncDrainScheduled = false;
    sonic.emit("drain");
  }
  inherits(SonicBoom, EventEmitter);
  function mergeBuf(bufs, len) {
    if (bufs.length === 0) {
      return kEmptyBuffer;
    }
    if (bufs.length === 1) {
      return bufs[0];
    }
    return Buffer.concat(bufs, len);
  }
  function write(data) {
    if (this.destroyed) {
      throw new Error("SonicBoom destroyed");
    }
    data = "" + data;
    const dataLen = Buffer.byteLength(data);
    const len = this._len + dataLen;
    const bufs = this._bufs;
    if (this.maxLength && len > this.maxLength) {
      this.emit("drop", data);
      return this._len < this._hwm;
    }
    if (bufs.length === 0 || Buffer.byteLength(bufs[bufs.length - 1]) + dataLen > this.maxWrite) {
      bufs.push(data);
    } else {
      bufs[bufs.length - 1] += data;
    }
    this._len = len;
    if (!this._writing && this._len >= this.minLength) {
      this._actualWrite();
    }
    return this._len < this._hwm;
  }
  function writeBuffer(data) {
    if (this.destroyed) {
      throw new Error("SonicBoom destroyed");
    }
    const len = this._len + data.length;
    const bufs = this._bufs;
    const lens = this._lens;
    if (this.maxLength && len > this.maxLength) {
      this.emit("drop", data);
      return this._len < this._hwm;
    }
    if (bufs.length === 0 || lens[lens.length - 1] + data.length > this.maxWrite) {
      bufs.push([data]);
      lens.push(data.length);
    } else {
      bufs[bufs.length - 1].push(data);
      lens[lens.length - 1] += data.length;
    }
    this._len = len;
    if (!this._writing && this._len >= this.minLength) {
      this._actualWrite();
    }
    return this._len < this._hwm;
  }
  function callFlushCallbackOnDrain(cb) {
    this._flushPending = true;
    const onDrain = () => {
      if (!this._fsync) {
        try {
          fs.fsync(this.fd, (err) => {
            this._flushPending = false;
            cb(err);
          });
        } catch (err) {
          cb(err);
        }
      } else {
        this._flushPending = false;
        cb();
      }
      this.off("error", onError);
    };
    const onError = (err) => {
      this._flushPending = false;
      cb(err);
      this.off("drain", onDrain);
    };
    this.once("drain", onDrain);
    this.once("error", onError);
  }
  function flush(cb) {
    if (cb != null && typeof cb !== "function") {
      throw new Error("flush cb must be a function");
    }
    if (this.destroyed) {
      const error = new Error("SonicBoom destroyed");
      if (cb) {
        cb(error);
        return;
      }
      throw error;
    }
    if (this.minLength <= 0) {
      cb?.();
      return;
    }
    if (cb) {
      callFlushCallbackOnDrain.call(this, cb);
    }
    if (this._writing) {
      return;
    }
    if (this._bufs.length === 0) {
      this._bufs.push("");
    }
    this._actualWrite();
  }
  function flushBuffer(cb) {
    if (cb != null && typeof cb !== "function") {
      throw new Error("flush cb must be a function");
    }
    if (this.destroyed) {
      const error = new Error("SonicBoom destroyed");
      if (cb) {
        cb(error);
        return;
      }
      throw error;
    }
    if (this.minLength <= 0) {
      cb?.();
      return;
    }
    if (cb) {
      callFlushCallbackOnDrain.call(this, cb);
    }
    if (this._writing) {
      return;
    }
    if (this._bufs.length === 0) {
      this._bufs.push([]);
      this._lens.push(0);
    }
    this._actualWrite();
  }
  SonicBoom.prototype.reopen = function(file) {
    if (this.destroyed) {
      throw new Error("SonicBoom destroyed");
    }
    if (this._opening) {
      this.once("ready", () => {
        this.reopen(file);
      });
      return;
    }
    if (this._ending) {
      return;
    }
    if (!this.file) {
      throw new Error("Unable to reopen a file descriptor, you must pass a file to SonicBoom");
    }
    if (file) {
      this.file = file;
    }
    this._reopening = true;
    if (this._writing) {
      return;
    }
    const fd = this.fd;
    this.once("ready", () => {
      if (fd !== this.fd) {
        fs.close(fd, (err) => {
          if (err) {
            return this.emit("error", err);
          }
        });
      }
    });
    openFile(this.file, this);
  };
  SonicBoom.prototype.end = function() {
    if (this.destroyed) {
      throw new Error("SonicBoom destroyed");
    }
    if (this._opening) {
      this.once("ready", () => {
        this.end();
      });
      return;
    }
    if (this._ending) {
      return;
    }
    this._ending = true;
    if (this._writing) {
      return;
    }
    if (this._len > 0 && this.fd >= 0) {
      this._actualWrite();
    } else {
      actualClose(this);
    }
  };
  function flushSync() {
    if (this.destroyed) {
      throw new Error("SonicBoom destroyed");
    }
    if (this.fd < 0) {
      throw new Error("sonic boom is not ready yet");
    }
    if (!this._writing && this._writingBuf.length > 0) {
      this._bufs.unshift(this._writingBuf);
      this._writingBuf = "";
    }
    let buf = "";
    while (this._bufs.length || buf.length) {
      if (buf.length <= 0) {
        buf = this._bufs[0];
      }
      try {
        const n = Buffer.isBuffer(buf) ? fs.writeSync(this.fd, buf) : fs.writeSync(this.fd, buf, "utf8");
        const releasedBufObj = releaseWritingBuf(buf, this._len, n);
        buf = releasedBufObj.writingBuf;
        this._len = releasedBufObj.len;
        if (buf.length <= 0) {
          this._bufs.shift();
        }
      } catch (err) {
        const shouldRetry = err.code === "EAGAIN" || err.code === "EBUSY";
        if (shouldRetry && !this.retryEAGAIN(err, buf.length, this._len - buf.length)) {
          throw err;
        }
        sleep(BUSY_WRITE_TIMEOUT);
      }
    }
    try {
      fs.fsyncSync(this.fd);
    } catch {}
  }
  function flushBufferSync() {
    if (this.destroyed) {
      throw new Error("SonicBoom destroyed");
    }
    if (this.fd < 0) {
      throw new Error("sonic boom is not ready yet");
    }
    if (!this._writing && this._writingBuf.length > 0) {
      this._bufs.unshift([this._writingBuf]);
      this._writingBuf = kEmptyBuffer;
    }
    let buf = kEmptyBuffer;
    while (this._bufs.length || buf.length) {
      if (buf.length <= 0) {
        buf = mergeBuf(this._bufs[0], this._lens[0]);
      }
      try {
        const n = fs.writeSync(this.fd, buf);
        buf = buf.subarray(n);
        this._len = Math.max(this._len - n, 0);
        if (buf.length <= 0) {
          this._bufs.shift();
          this._lens.shift();
        }
      } catch (err) {
        const shouldRetry = err.code === "EAGAIN" || err.code === "EBUSY";
        if (shouldRetry && !this.retryEAGAIN(err, buf.length, this._len - buf.length)) {
          throw err;
        }
        sleep(BUSY_WRITE_TIMEOUT);
      }
    }
  }
  SonicBoom.prototype.destroy = function() {
    if (this.destroyed) {
      return;
    }
    actualClose(this);
  };
  function actualWrite() {
    const release = this.release;
    this._writing = true;
    this._writingBuf = this._writingBuf.length ? this._writingBuf : this._bufs.shift() || "";
    if (this.sync) {
      try {
        const written = Buffer.isBuffer(this._writingBuf) ? fs.writeSync(this.fd, this._writingBuf) : fs.writeSync(this.fd, this._writingBuf, "utf8");
        release(null, written);
      } catch (err) {
        release(err);
      }
    } else {
      fs.write(this.fd, this._writingBuf, release);
    }
  }
  function actualWriteBuffer() {
    const release = this.release;
    this._writing = true;
    this._writingBuf = this._writingBuf.length ? this._writingBuf : mergeBuf(this._bufs.shift(), this._lens.shift());
    if (this.sync) {
      try {
        const written = fs.writeSync(this.fd, this._writingBuf);
        release(null, written);
      } catch (err) {
        release(err);
      }
    } else {
      if (kCopyBuffer) {
        this._writingBuf = Buffer.from(this._writingBuf);
      }
      fs.write(this.fd, this._writingBuf, release);
    }
  }
  function actualClose(sonic) {
    if (sonic.fd === -1) {
      sonic.once("ready", actualClose.bind(null, sonic));
      return;
    }
    if (sonic._periodicFlushTimer !== undefined) {
      clearInterval(sonic._periodicFlushTimer);
    }
    sonic.destroyed = true;
    sonic._bufs = [];
    sonic._lens = [];
    assert(typeof sonic.fd === "number", `sonic.fd must be a number, got ${typeof sonic.fd}`);
    try {
      fs.fsync(sonic.fd, closeWrapped);
    } catch {}
    function closeWrapped() {
      if (sonic.fd !== 1 && sonic.fd !== 2) {
        fs.close(sonic.fd, done);
      } else {
        done();
      }
    }
    function done(err) {
      if (err) {
        sonic.emit("error", err);
        return;
      }
      if (sonic._ending && !sonic._writing) {
        sonic.emit("finish");
      }
      sonic.emit("close");
    }
  }
  SonicBoom.SonicBoom = SonicBoom;
  SonicBoom.default = SonicBoom;
  module.exports = SonicBoom;
});

// node_modules/.bun/on-exit-leak-free@2.1.2/node_modules/on-exit-leak-free/index.js
var require_on_exit_leak_free = __commonJS((exports, module) => {
  var refs = {
    exit: [],
    beforeExit: []
  };
  var functions = {
    exit: onExit,
    beforeExit: onBeforeExit
  };
  var registry;
  function ensureRegistry() {
    if (registry === undefined) {
      registry = new FinalizationRegistry(clear);
    }
  }
  function install(event) {
    if (refs[event].length > 0) {
      return;
    }
    process.on(event, functions[event]);
  }
  function uninstall(event) {
    if (refs[event].length > 0) {
      return;
    }
    process.removeListener(event, functions[event]);
    if (refs.exit.length === 0 && refs.beforeExit.length === 0) {
      registry = undefined;
    }
  }
  function onExit() {
    callRefs("exit");
  }
  function onBeforeExit() {
    callRefs("beforeExit");
  }
  function callRefs(event) {
    for (const ref of refs[event]) {
      const obj = ref.deref();
      const fn = ref.fn;
      if (obj !== undefined) {
        fn(obj, event);
      }
    }
    refs[event] = [];
  }
  function clear(ref) {
    for (const event of ["exit", "beforeExit"]) {
      const index = refs[event].indexOf(ref);
      refs[event].splice(index, index + 1);
      uninstall(event);
    }
  }
  function _register(event, obj, fn) {
    if (obj === undefined) {
      throw new Error("the object can't be undefined");
    }
    install(event);
    const ref = new WeakRef(obj);
    ref.fn = fn;
    ensureRegistry();
    registry.register(obj, ref);
    refs[event].push(ref);
  }
  function register(obj, fn) {
    _register("exit", obj, fn);
  }
  function registerBeforeExit(obj, fn) {
    _register("beforeExit", obj, fn);
  }
  function unregister(obj) {
    if (registry === undefined) {
      return;
    }
    registry.unregister(obj);
    for (const event of ["exit", "beforeExit"]) {
      refs[event] = refs[event].filter((ref) => {
        const _obj = ref.deref();
        return _obj && _obj !== obj;
      });
      uninstall(event);
    }
  }
  module.exports = {
    register,
    registerBeforeExit,
    unregister
  };
});

// node_modules/.bun/thread-stream@4.0.0/node_modules/thread-stream/package.json
var require_package = __commonJS((exports, module) => {
  module.exports = {
    name: "thread-stream",
    version: "4.0.0",
    description: "A streaming way to send data to a Node.js Worker Thread",
    main: "index.js",
    types: "index.d.ts",
    engines: {
      node: ">=20"
    },
    dependencies: {
      "real-require": "^0.2.0"
    },
    devDependencies: {
      "@types/node": "^22.0.0",
      "@yao-pkg/pkg": "^6.0.0",
      borp: "^0.21.0",
      desm: "^1.3.0",
      eslint: "^9.39.1",
      fastbench: "^1.0.1",
      husky: "^9.0.6",
      neostandard: "^0.12.2",
      "pino-elasticsearch": "^8.0.0",
      "sonic-boom": "^4.0.1",
      "ts-node": "^10.8.0",
      typescript: "~5.7.3"
    },
    scripts: {
      build: "tsc --noEmit",
      lint: "eslint",
      test: "npm run lint && npm run build && npm run transpile && borp --pattern 'test/*.test.{js,mjs}'",
      "test:ci": "npm run lint && npm run transpile && borp --pattern 'test/*.test.{js,mjs}'",
      "test:yarn": "npm run transpile && borp --pattern 'test/*.test.js'",
      transpile: "sh ./test/ts/transpile.sh",
      prepare: "husky install"
    },
    repository: {
      type: "git",
      url: "git+https://github.com/mcollina/thread-stream.git"
    },
    keywords: [
      "worker",
      "thread",
      "threads",
      "stream"
    ],
    author: "Matteo Collina <hello@matteocollina.com>",
    license: "MIT",
    bugs: {
      url: "https://github.com/mcollina/thread-stream/issues"
    },
    homepage: "https://github.com/mcollina/thread-stream#readme"
  };
});

// node_modules/.bun/thread-stream@4.0.0/node_modules/thread-stream/lib/wait.js
var require_wait = __commonJS((exports, module) => {
  var WAIT_MS = 1e4;
  function wait(state, index, expected, timeout, done) {
    const max = timeout === Infinity ? Infinity : Date.now() + timeout;
    const check = () => {
      const current = Atomics.load(state, index);
      if (current === expected) {
        done(null, "ok");
        return;
      }
      if (max !== Infinity && Date.now() > max) {
        done(null, "timed-out");
        return;
      }
      const remaining = max === Infinity ? WAIT_MS : Math.min(WAIT_MS, Math.max(1, max - Date.now()));
      const result = Atomics.waitAsync(state, index, current, remaining);
      if (result.async) {
        result.value.then(check);
      } else {
        setImmediate(check);
      }
    };
    check();
  }
  function waitDiff(state, index, expected, timeout, done) {
    const max = timeout === Infinity ? Infinity : Date.now() + timeout;
    const check = () => {
      const current = Atomics.load(state, index);
      if (current !== expected) {
        done(null, "ok");
        return;
      }
      if (max !== Infinity && Date.now() > max) {
        done(null, "timed-out");
        return;
      }
      const remaining = max === Infinity ? WAIT_MS : Math.min(WAIT_MS, Math.max(1, max - Date.now()));
      const result = Atomics.waitAsync(state, index, expected, remaining);
      if (result.async) {
        result.value.then(check);
      } else {
        setImmediate(check);
      }
    };
    check();
  }
  module.exports = { wait, waitDiff };
});

// node_modules/.bun/thread-stream@4.0.0/node_modules/thread-stream/lib/indexes.js
var require_indexes = __commonJS((exports, module) => {
  var WRITE_INDEX = 4;
  var READ_INDEX = 8;
  module.exports = {
    WRITE_INDEX,
    READ_INDEX
  };
});

// node_modules/.bun/thread-stream@4.0.0/node_modules/thread-stream/index.js
var require_thread_stream = __commonJS((exports, module) => {
  var __dirname = "/home/kncos/Documents/cracked-judge/node_modules/.bun/thread-stream@4.0.0/node_modules/thread-stream";
  var { version } = require_package();
  var { EventEmitter } = __require("events");
  var { Worker } = __require("worker_threads");
  var { join } = __require("path");
  var { pathToFileURL } = __require("url");
  var { wait } = require_wait();
  var {
    WRITE_INDEX,
    READ_INDEX
  } = require_indexes();
  var buffer = __require("buffer");
  var assert = __require("assert");
  var kImpl = Symbol("kImpl");
  var MAX_STRING = buffer.constants.MAX_STRING_LENGTH;

  class FakeWeakRef {
    constructor(value) {
      this._value = value;
    }
    deref() {
      return this._value;
    }
  }

  class FakeFinalizationRegistry {
    register() {}
    unregister() {}
  }
  var FinalizationRegistry2 = process.env.NODE_V8_COVERAGE ? FakeFinalizationRegistry : global.FinalizationRegistry || FakeFinalizationRegistry;
  var WeakRef2 = process.env.NODE_V8_COVERAGE ? FakeWeakRef : global.WeakRef || FakeWeakRef;
  var registry = new FinalizationRegistry2((worker) => {
    if (worker.exited) {
      return;
    }
    worker.terminate();
  });
  function createWorker(stream, opts) {
    const { filename, workerData } = opts;
    const bundlerOverrides = "__bundlerPathsOverrides" in globalThis ? globalThis.__bundlerPathsOverrides : {};
    const toExecute = bundlerOverrides["thread-stream-worker"] || join(__dirname, "lib", "worker.js");
    const worker = new Worker(toExecute, {
      ...opts.workerOpts,
      trackUnmanagedFds: false,
      workerData: {
        filename: filename.indexOf("file://") === 0 ? filename : pathToFileURL(filename).href,
        dataBuf: stream[kImpl].dataBuf,
        stateBuf: stream[kImpl].stateBuf,
        workerData: {
          $context: {
            threadStreamVersion: version
          },
          ...workerData
        }
      }
    });
    worker.stream = new FakeWeakRef(stream);
    worker.on("message", onWorkerMessage);
    worker.on("exit", onWorkerExit);
    registry.register(stream, worker);
    return worker;
  }
  function drain(stream) {
    assert(!stream[kImpl].sync);
    if (stream[kImpl].needDrain) {
      stream[kImpl].needDrain = false;
      stream.emit("drain");
    }
  }
  function nextFlush(stream) {
    const writeIndex = Atomics.load(stream[kImpl].state, WRITE_INDEX);
    let leftover = stream[kImpl].data.length - writeIndex;
    if (leftover > 0) {
      if (stream[kImpl].buf.length === 0) {
        stream[kImpl].flushing = false;
        if (stream[kImpl].ending) {
          end(stream);
        } else if (stream[kImpl].needDrain) {
          process.nextTick(drain, stream);
        }
        return;
      }
      let toWrite = stream[kImpl].buf.slice(0, leftover);
      let toWriteBytes = Buffer.byteLength(toWrite);
      if (toWriteBytes <= leftover) {
        stream[kImpl].buf = stream[kImpl].buf.slice(leftover);
        write(stream, toWrite, nextFlush.bind(null, stream));
      } else {
        stream.flush(() => {
          if (stream.destroyed) {
            return;
          }
          Atomics.store(stream[kImpl].state, READ_INDEX, 0);
          Atomics.store(stream[kImpl].state, WRITE_INDEX, 0);
          Atomics.notify(stream[kImpl].state, READ_INDEX);
          while (toWriteBytes > stream[kImpl].data.length) {
            leftover = leftover / 2;
            toWrite = stream[kImpl].buf.slice(0, leftover);
            toWriteBytes = Buffer.byteLength(toWrite);
          }
          stream[kImpl].buf = stream[kImpl].buf.slice(leftover);
          write(stream, toWrite, nextFlush.bind(null, stream));
        });
      }
    } else if (leftover === 0) {
      if (writeIndex === 0 && stream[kImpl].buf.length === 0) {
        return;
      }
      stream.flush(() => {
        Atomics.store(stream[kImpl].state, READ_INDEX, 0);
        Atomics.store(stream[kImpl].state, WRITE_INDEX, 0);
        Atomics.notify(stream[kImpl].state, READ_INDEX);
        nextFlush(stream);
      });
    } else {
      destroy(stream, new Error("overwritten"));
    }
  }
  function onWorkerMessage(msg) {
    const stream = this.stream.deref();
    if (stream === undefined) {
      this.exited = true;
      this.terminate();
      return;
    }
    switch (msg.code) {
      case "READY":
        this.stream = new WeakRef2(stream);
        stream.flush(() => {
          stream[kImpl].ready = true;
          stream.emit("ready");
        });
        break;
      case "ERROR":
        destroy(stream, msg.err);
        break;
      case "EVENT":
        if (Array.isArray(msg.args)) {
          stream.emit(msg.name, ...msg.args);
        } else {
          stream.emit(msg.name, msg.args);
        }
        break;
      case "WARNING":
        process.emitWarning(msg.err);
        break;
      default:
        destroy(stream, new Error("this should not happen: " + msg.code));
    }
  }
  function onWorkerExit(code) {
    const stream = this.stream.deref();
    if (stream === undefined) {
      return;
    }
    registry.unregister(stream);
    stream.worker.exited = true;
    stream.worker.off("exit", onWorkerExit);
    destroy(stream, code !== 0 ? new Error("the worker thread exited") : null);
  }

  class ThreadStream extends EventEmitter {
    constructor(opts = {}) {
      super();
      if (opts.bufferSize < 4) {
        throw new Error("bufferSize must at least fit a 4-byte utf-8 char");
      }
      this[kImpl] = {};
      this[kImpl].stateBuf = new SharedArrayBuffer(128);
      this[kImpl].state = new Int32Array(this[kImpl].stateBuf);
      this[kImpl].dataBuf = new SharedArrayBuffer(opts.bufferSize || 4 * 1024 * 1024);
      this[kImpl].data = Buffer.from(this[kImpl].dataBuf);
      this[kImpl].sync = opts.sync || false;
      this[kImpl].ending = false;
      this[kImpl].ended = false;
      this[kImpl].needDrain = false;
      this[kImpl].destroyed = false;
      this[kImpl].flushing = false;
      this[kImpl].ready = false;
      this[kImpl].finished = false;
      this[kImpl].errored = null;
      this[kImpl].closed = false;
      this[kImpl].buf = "";
      this.worker = createWorker(this, opts);
      this.on("message", (message, transferList) => {
        this.worker.postMessage(message, transferList);
      });
    }
    write(data) {
      if (this[kImpl].destroyed) {
        error(this, new Error("the worker has exited"));
        return false;
      }
      if (this[kImpl].ending) {
        error(this, new Error("the worker is ending"));
        return false;
      }
      if (this[kImpl].flushing && this[kImpl].buf.length + data.length >= MAX_STRING) {
        try {
          writeSync(this);
          this[kImpl].flushing = true;
        } catch (err) {
          destroy(this, err);
          return false;
        }
      }
      this[kImpl].buf += data;
      if (this[kImpl].sync) {
        try {
          writeSync(this);
          return true;
        } catch (err) {
          destroy(this, err);
          return false;
        }
      }
      if (!this[kImpl].flushing) {
        this[kImpl].flushing = true;
        setImmediate(nextFlush, this);
      }
      this[kImpl].needDrain = this[kImpl].data.length - this[kImpl].buf.length - Atomics.load(this[kImpl].state, WRITE_INDEX) <= 0;
      return !this[kImpl].needDrain;
    }
    end() {
      if (this[kImpl].destroyed) {
        return;
      }
      this[kImpl].ending = true;
      end(this);
    }
    flush(cb) {
      if (this[kImpl].destroyed) {
        if (typeof cb === "function") {
          process.nextTick(cb, new Error("the worker has exited"));
        }
        return;
      }
      const writeIndex = Atomics.load(this[kImpl].state, WRITE_INDEX);
      wait(this[kImpl].state, READ_INDEX, writeIndex, Infinity, (err, res) => {
        if (err) {
          destroy(this, err);
          process.nextTick(cb, err);
          return;
        }
        if (res === "not-equal") {
          this.flush(cb);
          return;
        }
        process.nextTick(cb);
      });
    }
    flushSync() {
      if (this[kImpl].destroyed) {
        return;
      }
      writeSync(this);
      flushSync(this);
    }
    unref() {
      this.worker.unref();
    }
    ref() {
      this.worker.ref();
    }
    get ready() {
      return this[kImpl].ready;
    }
    get destroyed() {
      return this[kImpl].destroyed;
    }
    get closed() {
      return this[kImpl].closed;
    }
    get writable() {
      return !this[kImpl].destroyed && !this[kImpl].ending;
    }
    get writableEnded() {
      return this[kImpl].ending;
    }
    get writableFinished() {
      return this[kImpl].finished;
    }
    get writableNeedDrain() {
      return this[kImpl].needDrain;
    }
    get writableObjectMode() {
      return false;
    }
    get writableErrored() {
      return this[kImpl].errored;
    }
  }
  function error(stream, err) {
    setImmediate(() => {
      stream.emit("error", err);
    });
  }
  function destroy(stream, err) {
    if (stream[kImpl].destroyed) {
      return;
    }
    stream[kImpl].destroyed = true;
    if (err) {
      stream[kImpl].errored = err;
      error(stream, err);
    }
    if (!stream.worker.exited) {
      stream.worker.terminate().catch(() => {}).then(() => {
        stream[kImpl].closed = true;
        stream.emit("close");
      });
    } else {
      setImmediate(() => {
        stream[kImpl].closed = true;
        stream.emit("close");
      });
    }
  }
  function write(stream, data, cb) {
    const current = Atomics.load(stream[kImpl].state, WRITE_INDEX);
    const length = Buffer.byteLength(data);
    stream[kImpl].data.write(data, current);
    Atomics.store(stream[kImpl].state, WRITE_INDEX, current + length);
    Atomics.notify(stream[kImpl].state, WRITE_INDEX);
    cb();
    return true;
  }
  function end(stream) {
    if (stream[kImpl].ended || !stream[kImpl].ending || stream[kImpl].flushing) {
      return;
    }
    stream[kImpl].ended = true;
    try {
      stream.flushSync();
      let readIndex = Atomics.load(stream[kImpl].state, READ_INDEX);
      Atomics.store(stream[kImpl].state, WRITE_INDEX, -1);
      Atomics.notify(stream[kImpl].state, WRITE_INDEX);
      let spins = 0;
      while (readIndex !== -1) {
        Atomics.wait(stream[kImpl].state, READ_INDEX, readIndex, 1000);
        readIndex = Atomics.load(stream[kImpl].state, READ_INDEX);
        if (readIndex === -2) {
          destroy(stream, new Error("end() failed"));
          return;
        }
        if (++spins === 10) {
          destroy(stream, new Error("end() took too long (10s)"));
          return;
        }
      }
      process.nextTick(() => {
        stream[kImpl].finished = true;
        stream.emit("finish");
      });
    } catch (err) {
      destroy(stream, err);
    }
  }
  function writeSync(stream) {
    const cb = () => {
      if (stream[kImpl].ending) {
        end(stream);
      } else if (stream[kImpl].needDrain) {
        process.nextTick(drain, stream);
      }
    };
    stream[kImpl].flushing = false;
    while (stream[kImpl].buf.length !== 0) {
      const writeIndex = Atomics.load(stream[kImpl].state, WRITE_INDEX);
      let leftover = stream[kImpl].data.length - writeIndex;
      if (leftover === 0) {
        flushSync(stream);
        Atomics.store(stream[kImpl].state, READ_INDEX, 0);
        Atomics.store(stream[kImpl].state, WRITE_INDEX, 0);
        Atomics.notify(stream[kImpl].state, READ_INDEX);
        continue;
      } else if (leftover < 0) {
        throw new Error("overwritten");
      }
      let toWrite = stream[kImpl].buf.slice(0, leftover);
      let toWriteBytes = Buffer.byteLength(toWrite);
      if (toWriteBytes <= leftover) {
        stream[kImpl].buf = stream[kImpl].buf.slice(leftover);
        write(stream, toWrite, cb);
      } else {
        flushSync(stream);
        Atomics.store(stream[kImpl].state, READ_INDEX, 0);
        Atomics.store(stream[kImpl].state, WRITE_INDEX, 0);
        Atomics.notify(stream[kImpl].state, READ_INDEX);
        while (toWriteBytes > stream[kImpl].buf.length) {
          leftover = leftover / 2;
          toWrite = stream[kImpl].buf.slice(0, leftover);
          toWriteBytes = Buffer.byteLength(toWrite);
        }
        stream[kImpl].buf = stream[kImpl].buf.slice(leftover);
        write(stream, toWrite, cb);
      }
    }
  }
  function flushSync(stream) {
    if (stream[kImpl].flushing) {
      throw new Error("unable to flush while flushing");
    }
    const writeIndex = Atomics.load(stream[kImpl].state, WRITE_INDEX);
    let spins = 0;
    while (true) {
      const readIndex = Atomics.load(stream[kImpl].state, READ_INDEX);
      if (readIndex === -2) {
        throw Error("_flushSync failed");
      }
      if (readIndex !== writeIndex) {
        Atomics.wait(stream[kImpl].state, READ_INDEX, readIndex, 1000);
      } else {
        break;
      }
      if (++spins === 10) {
        throw new Error("_flushSync took too long (10s)");
      }
    }
  }
  module.exports = ThreadStream;
});

// node_modules/.bun/pino@10.3.1/node_modules/pino/lib/transport.js
var require_transport = __commonJS((exports, module) => {
  var __dirname = "/home/kncos/Documents/cracked-judge/node_modules/.bun/pino@10.3.1/node_modules/pino/lib";
  var { createRequire } = __require("module");
  var { existsSync } = __require("fs");
  var getCallers = require_caller();
  var { join, isAbsolute, sep } = __require("path");
  var { fileURLToPath } = __require("url");
  var sleep = require_atomic_sleep();
  var onExit = require_on_exit_leak_free();
  var ThreadStream = require_thread_stream();
  function setupOnExit(stream) {
    onExit.register(stream, autoEnd);
    onExit.registerBeforeExit(stream, flush);
    stream.on("close", function() {
      onExit.unregister(stream);
    });
  }
  function hasPreloadFlags() {
    const execArgv = process.execArgv;
    for (let i = 0;i < execArgv.length; i++) {
      const arg = execArgv[i];
      if (arg === "--import" || arg === "--require" || arg === "-r") {
        return true;
      }
      if (arg.startsWith("--import=") || arg.startsWith("--require=") || arg.startsWith("-r=")) {
        return true;
      }
    }
    return false;
  }
  function sanitizeNodeOptions(nodeOptions) {
    const tokens = nodeOptions.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);
    if (!tokens) {
      return nodeOptions;
    }
    const sanitized = [];
    let changed = false;
    for (let i = 0;i < tokens.length; i++) {
      const token = tokens[i];
      if (token === "--require" || token === "-r" || token === "--import") {
        const next = tokens[i + 1];
        if (next && shouldDropPreload(next)) {
          changed = true;
          i++;
          continue;
        }
        sanitized.push(token);
        if (next) {
          sanitized.push(next);
          i++;
        }
        continue;
      }
      if (token.startsWith("--require=") || token.startsWith("-r=") || token.startsWith("--import=")) {
        const value = token.slice(token.indexOf("=") + 1);
        if (shouldDropPreload(value)) {
          changed = true;
          continue;
        }
      }
      sanitized.push(token);
    }
    return changed ? sanitized.join(" ") : nodeOptions;
  }
  function shouldDropPreload(value) {
    const unquoted = stripQuotes(value);
    if (!unquoted) {
      return false;
    }
    let path = unquoted;
    if (path.startsWith("file://")) {
      try {
        path = fileURLToPath(path);
      } catch {
        return false;
      }
    }
    return isAbsolute(path) && !existsSync(path);
  }
  function stripQuotes(value) {
    const first = value[0];
    const last = value[value.length - 1];
    if (first === '"' && last === '"' || first === "'" && last === "'") {
      return value.slice(1, -1);
    }
    return value;
  }
  function buildStream(filename, workerData, workerOpts, sync, name) {
    if (!workerOpts.execArgv && hasPreloadFlags() && __require.main === undefined) {
      workerOpts = {
        ...workerOpts,
        execArgv: []
      };
    }
    if (!workerOpts.env && process.env.NODE_OPTIONS) {
      const nodeOptions = sanitizeNodeOptions(process.env.NODE_OPTIONS);
      if (nodeOptions !== process.env.NODE_OPTIONS) {
        workerOpts = {
          ...workerOpts,
          env: {
            ...process.env,
            NODE_OPTIONS: nodeOptions
          }
        };
      }
    }
    workerOpts = { ...workerOpts, name };
    const stream = new ThreadStream({
      filename,
      workerData,
      workerOpts,
      sync
    });
    stream.on("ready", onReady);
    stream.on("close", function() {
      process.removeListener("exit", onExit2);
    });
    process.on("exit", onExit2);
    function onReady() {
      process.removeListener("exit", onExit2);
      stream.unref();
      if (workerOpts.autoEnd !== false) {
        setupOnExit(stream);
      }
    }
    function onExit2() {
      if (stream.closed) {
        return;
      }
      stream.flushSync();
      sleep(100);
      stream.end();
    }
    return stream;
  }
  function autoEnd(stream) {
    stream.ref();
    stream.flushSync();
    stream.end();
    stream.once("close", function() {
      stream.unref();
    });
  }
  function flush(stream) {
    stream.flushSync();
  }
  function transport(fullOptions) {
    const { pipeline, targets, levels, dedupe, worker = {}, caller = getCallers(), sync = false } = fullOptions;
    const options = {
      ...fullOptions.options
    };
    const callers = typeof caller === "string" ? [caller] : caller;
    const bundlerOverrides = typeof globalThis === "object" && Object.prototype.hasOwnProperty.call(globalThis, "__bundlerPathsOverrides") && globalThis.__bundlerPathsOverrides && typeof globalThis.__bundlerPathsOverrides === "object" ? globalThis.__bundlerPathsOverrides : Object.create(null);
    let target = fullOptions.target;
    if (target && targets) {
      throw new Error("only one of target or targets can be specified");
    }
    if (targets) {
      target = bundlerOverrides["pino-worker"] || join(__dirname, "worker.js");
      options.targets = targets.filter((dest) => dest.target).map((dest) => {
        return {
          ...dest,
          target: fixTarget(dest.target)
        };
      });
      options.pipelines = targets.filter((dest) => dest.pipeline).map((dest) => {
        return dest.pipeline.map((t) => {
          return {
            ...t,
            level: dest.level,
            target: fixTarget(t.target)
          };
        });
      });
    } else if (pipeline) {
      target = bundlerOverrides["pino-worker"] || join(__dirname, "worker.js");
      options.pipelines = [pipeline.map((dest) => {
        return {
          ...dest,
          target: fixTarget(dest.target)
        };
      })];
    }
    if (levels) {
      options.levels = levels;
    }
    if (dedupe) {
      options.dedupe = dedupe;
    }
    options.pinoWillSendConfig = true;
    const name = targets || pipeline ? "pino.transport" : target;
    return buildStream(fixTarget(target), options, worker, sync, name);
    function fixTarget(origin) {
      origin = bundlerOverrides[origin] || origin;
      if (isAbsolute(origin) || origin.indexOf("file://") === 0) {
        return origin;
      }
      if (origin === "pino/file") {
        return join(__dirname, "..", "file.js");
      }
      let fixTarget2;
      for (const filePath of callers) {
        try {
          const context = filePath === "node:repl" ? process.cwd() + sep : filePath;
          fixTarget2 = createRequire(context).resolve(origin);
          break;
        } catch (err) {
          continue;
        }
      }
      if (!fixTarget2) {
        throw new Error(`unable to determine transport target for "${origin}"`);
      }
      return fixTarget2;
    }
  }
  module.exports = transport;
});

// node_modules/.bun/pino@10.3.1/node_modules/pino/lib/tools.js
var require_tools = __commonJS((exports, module) => {
  var diagChan = __require("diagnostics_channel");
  var format = require_quick_format_unescaped();
  var { mapHttpRequest, mapHttpResponse } = require_pino_std_serializers();
  var SonicBoom = require_sonic_boom();
  var onExit = require_on_exit_leak_free();
  var {
    lsCacheSym,
    chindingsSym,
    writeSym,
    serializersSym,
    formatOptsSym,
    endSym,
    stringifiersSym,
    stringifySym,
    stringifySafeSym,
    wildcardFirstSym,
    nestedKeySym,
    formattersSym,
    messageKeySym,
    errorKeySym,
    nestedKeyStrSym,
    msgPrefixSym
  } = require_symbols();
  var { isMainThread } = __require("worker_threads");
  var transport = require_transport();
  var [nodeMajor] = process.versions.node.split(".").map((v) => Number(v));
  var asJsonChan = diagChan.tracingChannel("pino_asJson");
  var asString = nodeMajor >= 25 ? (str) => JSON.stringify(str) : _asString;
  function noop() {}
  function genLog(level, hook) {
    if (!hook)
      return LOG;
    return function hookWrappedLog(...args) {
      hook.call(this, args, LOG, level);
    };
    function LOG(o, ...n) {
      if (typeof o === "object") {
        let msg = o;
        if (o !== null) {
          if (o.method && o.headers && o.socket) {
            o = mapHttpRequest(o);
          } else if (typeof o.setHeader === "function") {
            o = mapHttpResponse(o);
          }
        }
        let formatParams;
        if (msg === null && n.length === 0) {
          formatParams = [null];
        } else {
          msg = n.shift();
          formatParams = n;
        }
        if (typeof this[msgPrefixSym] === "string" && msg !== undefined && msg !== null) {
          msg = this[msgPrefixSym] + msg;
        }
        this[writeSym](o, format(msg, formatParams, this[formatOptsSym]), level);
      } else {
        let msg = o === undefined ? n.shift() : o;
        if (typeof this[msgPrefixSym] === "string" && msg !== undefined && msg !== null) {
          msg = this[msgPrefixSym] + msg;
        }
        this[writeSym](null, format(msg, n, this[formatOptsSym]), level);
      }
    }
  }
  function _asString(str) {
    let result = "";
    let last = 0;
    let found = false;
    let point = 255;
    const l = str.length;
    if (l > 100) {
      return JSON.stringify(str);
    }
    for (var i = 0;i < l && point >= 32; i++) {
      point = str.charCodeAt(i);
      if (point === 34 || point === 92) {
        result += str.slice(last, i) + "\\";
        last = i;
        found = true;
      }
    }
    if (!found) {
      result = str;
    } else {
      result += str.slice(last);
    }
    return point < 32 ? JSON.stringify(str) : '"' + result + '"';
  }
  function asJson(obj, msg, num, time) {
    if (asJsonChan.hasSubscribers === false) {
      return _asJson.call(this, obj, msg, num, time);
    }
    const store = { instance: this, arguments };
    return asJsonChan.traceSync(_asJson, store, this, obj, msg, num, time);
  }
  function _asJson(obj, msg, num, time) {
    const stringify2 = this[stringifySym];
    const stringifySafe = this[stringifySafeSym];
    const stringifiers = this[stringifiersSym];
    const end = this[endSym];
    const chindings = this[chindingsSym];
    const serializers = this[serializersSym];
    const formatters = this[formattersSym];
    const messageKey = this[messageKeySym];
    const errorKey = this[errorKeySym];
    let data = this[lsCacheSym][num] + time;
    data = data + chindings;
    let value;
    if (formatters.log) {
      obj = formatters.log(obj);
    }
    const wildcardStringifier = stringifiers[wildcardFirstSym];
    let propStr = "";
    for (const key in obj) {
      value = obj[key];
      if (Object.prototype.hasOwnProperty.call(obj, key) && value !== undefined) {
        if (serializers[key]) {
          value = serializers[key](value);
        } else if (key === errorKey && serializers.err) {
          value = serializers.err(value);
        }
        const stringifier = stringifiers[key] || wildcardStringifier;
        switch (typeof value) {
          case "undefined":
          case "function":
            continue;
          case "number":
            if (Number.isFinite(value) === false) {
              value = null;
            }
          case "boolean":
            if (stringifier)
              value = stringifier(value);
            break;
          case "string":
            value = (stringifier || asString)(value);
            break;
          default:
            value = (stringifier || stringify2)(value, stringifySafe);
        }
        if (value === undefined)
          continue;
        const strKey = asString(key);
        propStr += "," + strKey + ":" + value;
      }
    }
    let msgStr = "";
    if (msg !== undefined) {
      value = serializers[messageKey] ? serializers[messageKey](msg) : msg;
      const stringifier = stringifiers[messageKey] || wildcardStringifier;
      switch (typeof value) {
        case "function":
          break;
        case "number":
          if (Number.isFinite(value) === false) {
            value = null;
          }
        case "boolean":
          if (stringifier)
            value = stringifier(value);
          msgStr = ',"' + messageKey + '":' + value;
          break;
        case "string":
          value = (stringifier || asString)(value);
          msgStr = ',"' + messageKey + '":' + value;
          break;
        default:
          value = (stringifier || stringify2)(value, stringifySafe);
          msgStr = ',"' + messageKey + '":' + value;
      }
    }
    if (this[nestedKeySym] && propStr) {
      return data + this[nestedKeyStrSym] + propStr.slice(1) + "}" + msgStr + end;
    } else {
      return data + propStr + msgStr + end;
    }
  }
  function asChindings(instance, bindings) {
    let value;
    let data = instance[chindingsSym];
    const stringify2 = instance[stringifySym];
    const stringifySafe = instance[stringifySafeSym];
    const stringifiers = instance[stringifiersSym];
    const wildcardStringifier = stringifiers[wildcardFirstSym];
    const serializers = instance[serializersSym];
    const formatter = instance[formattersSym].bindings;
    bindings = formatter(bindings);
    for (const key in bindings) {
      value = bindings[key];
      const valid = (key.length < 5 || key !== "level" && key !== "serializers" && key !== "formatters" && key !== "customLevels") && bindings.hasOwnProperty(key) && value !== undefined;
      if (valid === true) {
        value = serializers[key] ? serializers[key](value) : value;
        value = (stringifiers[key] || wildcardStringifier || stringify2)(value, stringifySafe);
        if (value === undefined)
          continue;
        data += ',"' + key + '":' + value;
      }
    }
    return data;
  }
  function hasBeenTampered(stream) {
    return stream.write !== stream.constructor.prototype.write;
  }
  function buildSafeSonicBoom(opts) {
    const stream = new SonicBoom(opts);
    stream.on("error", filterBrokenPipe);
    if (!opts.sync && isMainThread) {
      onExit.register(stream, autoEnd);
      stream.on("close", function() {
        onExit.unregister(stream);
      });
    }
    return stream;
    function filterBrokenPipe(err) {
      if (err.code === "EPIPE") {
        stream.write = noop;
        stream.end = noop;
        stream.flushSync = noop;
        stream.destroy = noop;
        return;
      }
      stream.removeListener("error", filterBrokenPipe);
      stream.emit("error", err);
    }
  }
  function autoEnd(stream, eventName) {
    if (stream.destroyed) {
      return;
    }
    if (eventName === "beforeExit") {
      stream.flush();
      stream.on("drain", function() {
        stream.end();
      });
    } else {
      stream.flushSync();
    }
  }
  function createArgsNormalizer(defaultOptions) {
    return function normalizeArgs(instance, caller, opts = {}, stream) {
      if (typeof opts === "string") {
        stream = buildSafeSonicBoom({ dest: opts });
        opts = {};
      } else if (typeof stream === "string") {
        if (opts && opts.transport) {
          throw Error("only one of option.transport or stream can be specified");
        }
        stream = buildSafeSonicBoom({ dest: stream });
      } else if (opts instanceof SonicBoom || opts.writable || opts._writableState) {
        stream = opts;
        opts = {};
      } else if (opts.transport) {
        if (opts.transport instanceof SonicBoom || opts.transport.writable || opts.transport._writableState) {
          throw Error("option.transport do not allow stream, please pass to option directly. e.g. pino(transport)");
        }
        if (opts.transport.targets && opts.transport.targets.length && opts.formatters && typeof opts.formatters.level === "function") {
          throw Error("option.transport.targets do not allow custom level formatters");
        }
        let customLevels;
        if (opts.customLevels) {
          customLevels = opts.useOnlyCustomLevels ? opts.customLevels : Object.assign({}, opts.levels, opts.customLevels);
        }
        stream = transport({ caller, ...opts.transport, levels: customLevels });
      }
      opts = Object.assign({}, defaultOptions, opts);
      opts.serializers = Object.assign({}, defaultOptions.serializers, opts.serializers);
      opts.formatters = Object.assign({}, defaultOptions.formatters, opts.formatters);
      if (opts.prettyPrint) {
        throw new Error("prettyPrint option is no longer supported, see the pino-pretty package (https://github.com/pinojs/pino-pretty)");
      }
      const { enabled, onChild } = opts;
      if (enabled === false)
        opts.level = "silent";
      if (!onChild)
        opts.onChild = noop;
      if (!stream) {
        if (!hasBeenTampered(process.stdout)) {
          stream = buildSafeSonicBoom({ fd: process.stdout.fd || 1 });
        } else {
          stream = process.stdout;
        }
      }
      return { opts, stream };
    };
  }
  function stringify(obj, stringifySafeFn) {
    try {
      return JSON.stringify(obj);
    } catch (_) {
      try {
        const stringify2 = stringifySafeFn || this[stringifySafeSym];
        return stringify2(obj);
      } catch (_2) {
        return '"[unable to serialize, circular reference is too complex to analyze]"';
      }
    }
  }
  function buildFormatters(level, bindings, log) {
    return {
      level,
      bindings,
      log
    };
  }
  function normalizeDestFileDescriptor(destination) {
    const fd = Number(destination);
    if (typeof destination === "string" && Number.isFinite(fd)) {
      return fd;
    }
    if (destination === undefined) {
      return 1;
    }
    return destination;
  }
  module.exports = {
    noop,
    buildSafeSonicBoom,
    asChindings,
    asJson,
    genLog,
    createArgsNormalizer,
    stringify,
    buildFormatters,
    normalizeDestFileDescriptor
  };
});

// node_modules/.bun/pino@10.3.1/node_modules/pino/lib/constants.js
var require_constants = __commonJS((exports, module) => {
  var DEFAULT_LEVELS = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60
  };
  var SORTING_ORDER = {
    ASC: "ASC",
    DESC: "DESC"
  };
  module.exports = {
    DEFAULT_LEVELS,
    SORTING_ORDER
  };
});

// node_modules/.bun/pino@10.3.1/node_modules/pino/lib/levels.js
var require_levels = __commonJS((exports, module) => {
  var {
    lsCacheSym,
    levelValSym,
    useOnlyCustomLevelsSym,
    streamSym,
    formattersSym,
    hooksSym,
    levelCompSym
  } = require_symbols();
  var { noop, genLog } = require_tools();
  var { DEFAULT_LEVELS, SORTING_ORDER } = require_constants();
  var levelMethods = {
    fatal: (hook) => {
      const logFatal = genLog(DEFAULT_LEVELS.fatal, hook);
      return function(...args) {
        const stream = this[streamSym];
        logFatal.call(this, ...args);
        if (typeof stream.flushSync === "function") {
          try {
            stream.flushSync();
          } catch (e) {}
        }
      };
    },
    error: (hook) => genLog(DEFAULT_LEVELS.error, hook),
    warn: (hook) => genLog(DEFAULT_LEVELS.warn, hook),
    info: (hook) => genLog(DEFAULT_LEVELS.info, hook),
    debug: (hook) => genLog(DEFAULT_LEVELS.debug, hook),
    trace: (hook) => genLog(DEFAULT_LEVELS.trace, hook)
  };
  var nums = Object.keys(DEFAULT_LEVELS).reduce((o, k) => {
    o[DEFAULT_LEVELS[k]] = k;
    return o;
  }, {});
  var initialLsCache = Object.keys(nums).reduce((o, k) => {
    o[k] = '{"level":' + Number(k);
    return o;
  }, {});
  function genLsCache(instance) {
    const formatter = instance[formattersSym].level;
    const { labels } = instance.levels;
    const cache = {};
    for (const label in labels) {
      const level = formatter(labels[label], Number(label));
      cache[label] = JSON.stringify(level).slice(0, -1);
    }
    instance[lsCacheSym] = cache;
    return instance;
  }
  function isStandardLevel(level, useOnlyCustomLevels) {
    if (useOnlyCustomLevels) {
      return false;
    }
    switch (level) {
      case "fatal":
      case "error":
      case "warn":
      case "info":
      case "debug":
      case "trace":
        return true;
      default:
        return false;
    }
  }
  function setLevel(level) {
    const { labels, values } = this.levels;
    if (typeof level === "number") {
      if (labels[level] === undefined)
        throw Error("unknown level value" + level);
      level = labels[level];
    }
    if (values[level] === undefined)
      throw Error("unknown level " + level);
    const preLevelVal = this[levelValSym];
    const levelVal = this[levelValSym] = values[level];
    const useOnlyCustomLevelsVal = this[useOnlyCustomLevelsSym];
    const levelComparison = this[levelCompSym];
    const hook = this[hooksSym].logMethod;
    for (const key in values) {
      if (levelComparison(values[key], levelVal) === false) {
        this[key] = noop;
        continue;
      }
      this[key] = isStandardLevel(key, useOnlyCustomLevelsVal) ? levelMethods[key](hook) : genLog(values[key], hook);
    }
    this.emit("level-change", level, levelVal, labels[preLevelVal], preLevelVal, this);
  }
  function getLevel(level) {
    const { levels, levelVal } = this;
    return levels && levels.labels ? levels.labels[levelVal] : "";
  }
  function isLevelEnabled(logLevel) {
    const { values } = this.levels;
    const logLevelVal = values[logLevel];
    return logLevelVal !== undefined && this[levelCompSym](logLevelVal, this[levelValSym]);
  }
  function compareLevel(direction, current, expected) {
    if (direction === SORTING_ORDER.DESC) {
      return current <= expected;
    }
    return current >= expected;
  }
  function genLevelComparison(levelComparison) {
    if (typeof levelComparison === "string") {
      return compareLevel.bind(null, levelComparison);
    }
    return levelComparison;
  }
  function mappings(customLevels = null, useOnlyCustomLevels = false) {
    const customNums = customLevels ? Object.keys(customLevels).reduce((o, k) => {
      o[customLevels[k]] = k;
      return o;
    }, {}) : null;
    const labels = Object.assign(Object.create(Object.prototype, { Infinity: { value: "silent" } }), useOnlyCustomLevels ? null : nums, customNums);
    const values = Object.assign(Object.create(Object.prototype, { silent: { value: Infinity } }), useOnlyCustomLevels ? null : DEFAULT_LEVELS, customLevels);
    return { labels, values };
  }
  function assertDefaultLevelFound(defaultLevel, customLevels, useOnlyCustomLevels) {
    if (typeof defaultLevel === "number") {
      const values = [].concat(Object.keys(customLevels || {}).map((key) => customLevels[key]), useOnlyCustomLevels ? [] : Object.keys(nums).map((level) => +level), Infinity);
      if (!values.includes(defaultLevel)) {
        throw Error(`default level:${defaultLevel} must be included in custom levels`);
      }
      return;
    }
    const labels = Object.assign(Object.create(Object.prototype, { silent: { value: Infinity } }), useOnlyCustomLevels ? null : DEFAULT_LEVELS, customLevels);
    if (!(defaultLevel in labels)) {
      throw Error(`default level:${defaultLevel} must be included in custom levels`);
    }
  }
  function assertNoLevelCollisions(levels, customLevels) {
    const { labels, values } = levels;
    for (const k in customLevels) {
      if (k in values) {
        throw Error("levels cannot be overridden");
      }
      if (customLevels[k] in labels) {
        throw Error("pre-existing level values cannot be used for new levels");
      }
    }
  }
  function assertLevelComparison(levelComparison) {
    if (typeof levelComparison === "function") {
      return;
    }
    if (typeof levelComparison === "string" && Object.values(SORTING_ORDER).includes(levelComparison)) {
      return;
    }
    throw new Error('Levels comparison should be one of "ASC", "DESC" or "function" type');
  }
  module.exports = {
    initialLsCache,
    genLsCache,
    levelMethods,
    getLevel,
    setLevel,
    isLevelEnabled,
    mappings,
    assertNoLevelCollisions,
    assertDefaultLevelFound,
    genLevelComparison,
    assertLevelComparison
  };
});

// node_modules/.bun/pino@10.3.1/node_modules/pino/lib/meta.js
var require_meta = __commonJS((exports, module) => {
  module.exports = { version: "10.3.1" };
});

// node_modules/.bun/pino@10.3.1/node_modules/pino/lib/proto.js
var require_proto = __commonJS((exports, module) => {
  var { EventEmitter } = __require("events");
  var {
    lsCacheSym,
    levelValSym,
    setLevelSym,
    getLevelSym,
    chindingsSym,
    mixinSym,
    asJsonSym,
    writeSym,
    mixinMergeStrategySym,
    timeSym,
    timeSliceIndexSym,
    streamSym,
    serializersSym,
    formattersSym,
    errorKeySym,
    messageKeySym,
    useOnlyCustomLevelsSym,
    needsMetadataGsym,
    redactFmtSym,
    stringifySym,
    formatOptsSym,
    stringifiersSym,
    msgPrefixSym,
    hooksSym
  } = require_symbols();
  var {
    getLevel,
    setLevel,
    isLevelEnabled,
    mappings,
    initialLsCache,
    genLsCache,
    assertNoLevelCollisions
  } = require_levels();
  var {
    asChindings,
    asJson,
    buildFormatters,
    stringify,
    noop
  } = require_tools();
  var {
    version
  } = require_meta();
  var redaction = require_redaction();
  var constructor = class Pino {
  };
  var prototype = {
    constructor,
    child,
    bindings,
    setBindings,
    flush,
    isLevelEnabled,
    version,
    get level() {
      return this[getLevelSym]();
    },
    set level(lvl) {
      this[setLevelSym](lvl);
    },
    get levelVal() {
      return this[levelValSym];
    },
    set levelVal(n) {
      throw Error("levelVal is read-only");
    },
    get msgPrefix() {
      return this[msgPrefixSym];
    },
    get [Symbol.toStringTag]() {
      return "Pino";
    },
    [lsCacheSym]: initialLsCache,
    [writeSym]: write,
    [asJsonSym]: asJson,
    [getLevelSym]: getLevel,
    [setLevelSym]: setLevel
  };
  Object.setPrototypeOf(prototype, EventEmitter.prototype);
  module.exports = function() {
    return Object.create(prototype);
  };
  var resetChildingsFormatter = (bindings2) => bindings2;
  function child(bindings2, options) {
    if (!bindings2) {
      throw Error("missing bindings for child Pino");
    }
    const serializers = this[serializersSym];
    const formatters = this[formattersSym];
    const instance = Object.create(this);
    if (options == null) {
      if (instance[formattersSym].bindings !== resetChildingsFormatter) {
        instance[formattersSym] = buildFormatters(formatters.level, resetChildingsFormatter, formatters.log);
      }
      instance[chindingsSym] = asChindings(instance, bindings2);
      if (this.onChild !== noop) {
        this.onChild(instance);
      }
      return instance;
    }
    if (options.hasOwnProperty("serializers") === true) {
      instance[serializersSym] = Object.create(null);
      for (const k in serializers) {
        instance[serializersSym][k] = serializers[k];
      }
      const parentSymbols = Object.getOwnPropertySymbols(serializers);
      for (var i = 0;i < parentSymbols.length; i++) {
        const ks = parentSymbols[i];
        instance[serializersSym][ks] = serializers[ks];
      }
      for (const bk in options.serializers) {
        instance[serializersSym][bk] = options.serializers[bk];
      }
      const bindingsSymbols = Object.getOwnPropertySymbols(options.serializers);
      for (var bi = 0;bi < bindingsSymbols.length; bi++) {
        const bks = bindingsSymbols[bi];
        instance[serializersSym][bks] = options.serializers[bks];
      }
    } else
      instance[serializersSym] = serializers;
    if (options.hasOwnProperty("formatters")) {
      const { level, bindings: chindings, log } = options.formatters;
      instance[formattersSym] = buildFormatters(level || formatters.level, chindings || resetChildingsFormatter, log || formatters.log);
    } else {
      instance[formattersSym] = buildFormatters(formatters.level, resetChildingsFormatter, formatters.log);
    }
    if (options.hasOwnProperty("customLevels") === true) {
      assertNoLevelCollisions(this.levels, options.customLevels);
      instance.levels = mappings(options.customLevels, instance[useOnlyCustomLevelsSym]);
      genLsCache(instance);
    }
    if (typeof options.redact === "object" && options.redact !== null || Array.isArray(options.redact)) {
      instance.redact = options.redact;
      const stringifiers = redaction(instance.redact, stringify);
      const formatOpts = { stringify: stringifiers[redactFmtSym] };
      instance[stringifySym] = stringify;
      instance[stringifiersSym] = stringifiers;
      instance[formatOptsSym] = formatOpts;
    }
    if (typeof options.msgPrefix === "string") {
      instance[msgPrefixSym] = (this[msgPrefixSym] || "") + options.msgPrefix;
    }
    instance[chindingsSym] = asChindings(instance, bindings2);
    if (options.level !== undefined && options.level !== this.level || options.hasOwnProperty("customLevels")) {
      const childLevel = options.level || this.level;
      instance[setLevelSym](childLevel);
    }
    this.onChild(instance);
    return instance;
  }
  function bindings() {
    const chindings = this[chindingsSym];
    const chindingsJson = `{${chindings.substr(1)}}`;
    const bindingsFromJson = JSON.parse(chindingsJson);
    delete bindingsFromJson.pid;
    delete bindingsFromJson.hostname;
    return bindingsFromJson;
  }
  function setBindings(newBindings) {
    const chindings = asChindings(this, newBindings);
    this[chindingsSym] = chindings;
  }
  function defaultMixinMergeStrategy(mergeObject, mixinObject) {
    return Object.assign(mixinObject, mergeObject);
  }
  function write(_obj, msg, num) {
    const t = this[timeSym]();
    const mixin = this[mixinSym];
    const errorKey = this[errorKeySym];
    const messageKey = this[messageKeySym];
    const mixinMergeStrategy = this[mixinMergeStrategySym] || defaultMixinMergeStrategy;
    let obj;
    const streamWriteHook = this[hooksSym].streamWrite;
    if (_obj === undefined || _obj === null) {
      obj = {};
    } else if (_obj instanceof Error) {
      obj = { [errorKey]: _obj };
      if (msg === undefined) {
        msg = _obj.message;
      }
    } else {
      obj = _obj;
      if (msg === undefined && _obj[messageKey] === undefined && _obj[errorKey]) {
        msg = _obj[errorKey].message;
      }
    }
    if (mixin) {
      obj = mixinMergeStrategy(obj, mixin(obj, num, this));
    }
    const s = this[asJsonSym](obj, msg, num, t);
    const stream = this[streamSym];
    if (stream[needsMetadataGsym] === true) {
      stream.lastLevel = num;
      stream.lastObj = obj;
      stream.lastMsg = msg;
      stream.lastTime = t.slice(this[timeSliceIndexSym]);
      stream.lastLogger = this;
    }
    stream.write(streamWriteHook ? streamWriteHook(s) : s);
  }
  function flush(cb) {
    if (cb != null && typeof cb !== "function") {
      throw Error("callback must be a function");
    }
    const stream = this[streamSym];
    if (typeof stream.flush === "function") {
      stream.flush(cb || noop);
    } else if (cb)
      cb();
  }
});

// node_modules/.bun/safe-stable-stringify@2.5.0/node_modules/safe-stable-stringify/index.js
var require_safe_stable_stringify = __commonJS((exports, module) => {
  var { hasOwnProperty } = Object.prototype;
  var stringify = configure();
  stringify.configure = configure;
  stringify.stringify = stringify;
  stringify.default = stringify;
  exports.stringify = stringify;
  exports.configure = configure;
  module.exports = stringify;
  var strEscapeSequencesRegExp = /[\u0000-\u001f\u0022\u005c\ud800-\udfff]/;
  function strEscape(str) {
    if (str.length < 5000 && !strEscapeSequencesRegExp.test(str)) {
      return `"${str}"`;
    }
    return JSON.stringify(str);
  }
  function sort(array, comparator) {
    if (array.length > 200 || comparator) {
      return array.sort(comparator);
    }
    for (let i = 1;i < array.length; i++) {
      const currentValue = array[i];
      let position = i;
      while (position !== 0 && array[position - 1] > currentValue) {
        array[position] = array[position - 1];
        position--;
      }
      array[position] = currentValue;
    }
    return array;
  }
  var typedArrayPrototypeGetSymbolToStringTag = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Object.getPrototypeOf(new Int8Array)), Symbol.toStringTag).get;
  function isTypedArrayWithEntries(value) {
    return typedArrayPrototypeGetSymbolToStringTag.call(value) !== undefined && value.length !== 0;
  }
  function stringifyTypedArray(array, separator, maximumBreadth) {
    if (array.length < maximumBreadth) {
      maximumBreadth = array.length;
    }
    const whitespace = separator === "," ? "" : " ";
    let res = `"0":${whitespace}${array[0]}`;
    for (let i = 1;i < maximumBreadth; i++) {
      res += `${separator}"${i}":${whitespace}${array[i]}`;
    }
    return res;
  }
  function getCircularValueOption(options) {
    if (hasOwnProperty.call(options, "circularValue")) {
      const circularValue = options.circularValue;
      if (typeof circularValue === "string") {
        return `"${circularValue}"`;
      }
      if (circularValue == null) {
        return circularValue;
      }
      if (circularValue === Error || circularValue === TypeError) {
        return {
          toString() {
            throw new TypeError("Converting circular structure to JSON");
          }
        };
      }
      throw new TypeError('The "circularValue" argument must be of type string or the value null or undefined');
    }
    return '"[Circular]"';
  }
  function getDeterministicOption(options) {
    let value;
    if (hasOwnProperty.call(options, "deterministic")) {
      value = options.deterministic;
      if (typeof value !== "boolean" && typeof value !== "function") {
        throw new TypeError('The "deterministic" argument must be of type boolean or comparator function');
      }
    }
    return value === undefined ? true : value;
  }
  function getBooleanOption(options, key) {
    let value;
    if (hasOwnProperty.call(options, key)) {
      value = options[key];
      if (typeof value !== "boolean") {
        throw new TypeError(`The "${key}" argument must be of type boolean`);
      }
    }
    return value === undefined ? true : value;
  }
  function getPositiveIntegerOption(options, key) {
    let value;
    if (hasOwnProperty.call(options, key)) {
      value = options[key];
      if (typeof value !== "number") {
        throw new TypeError(`The "${key}" argument must be of type number`);
      }
      if (!Number.isInteger(value)) {
        throw new TypeError(`The "${key}" argument must be an integer`);
      }
      if (value < 1) {
        throw new RangeError(`The "${key}" argument must be >= 1`);
      }
    }
    return value === undefined ? Infinity : value;
  }
  function getItemCount(number) {
    if (number === 1) {
      return "1 item";
    }
    return `${number} items`;
  }
  function getUniqueReplacerSet(replacerArray) {
    const replacerSet = new Set;
    for (const value of replacerArray) {
      if (typeof value === "string" || typeof value === "number") {
        replacerSet.add(String(value));
      }
    }
    return replacerSet;
  }
  function getStrictOption(options) {
    if (hasOwnProperty.call(options, "strict")) {
      const value = options.strict;
      if (typeof value !== "boolean") {
        throw new TypeError('The "strict" argument must be of type boolean');
      }
      if (value) {
        return (value2) => {
          let message = `Object can not safely be stringified. Received type ${typeof value2}`;
          if (typeof value2 !== "function")
            message += ` (${value2.toString()})`;
          throw new Error(message);
        };
      }
    }
  }
  function configure(options) {
    options = { ...options };
    const fail = getStrictOption(options);
    if (fail) {
      if (options.bigint === undefined) {
        options.bigint = false;
      }
      if (!("circularValue" in options)) {
        options.circularValue = Error;
      }
    }
    const circularValue = getCircularValueOption(options);
    const bigint = getBooleanOption(options, "bigint");
    const deterministic = getDeterministicOption(options);
    const comparator = typeof deterministic === "function" ? deterministic : undefined;
    const maximumDepth = getPositiveIntegerOption(options, "maximumDepth");
    const maximumBreadth = getPositiveIntegerOption(options, "maximumBreadth");
    function stringifyFnReplacer(key, parent, stack, replacer, spacer, indentation) {
      let value = parent[key];
      if (typeof value === "object" && value !== null && typeof value.toJSON === "function") {
        value = value.toJSON(key);
      }
      value = replacer.call(parent, key, value);
      switch (typeof value) {
        case "string":
          return strEscape(value);
        case "object": {
          if (value === null) {
            return "null";
          }
          if (stack.indexOf(value) !== -1) {
            return circularValue;
          }
          let res = "";
          let join = ",";
          const originalIndentation = indentation;
          if (Array.isArray(value)) {
            if (value.length === 0) {
              return "[]";
            }
            if (maximumDepth < stack.length + 1) {
              return '"[Array]"';
            }
            stack.push(value);
            if (spacer !== "") {
              indentation += spacer;
              res += `
${indentation}`;
              join = `,
${indentation}`;
            }
            const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
            let i = 0;
            for (;i < maximumValuesToStringify - 1; i++) {
              const tmp2 = stringifyFnReplacer(String(i), value, stack, replacer, spacer, indentation);
              res += tmp2 !== undefined ? tmp2 : "null";
              res += join;
            }
            const tmp = stringifyFnReplacer(String(i), value, stack, replacer, spacer, indentation);
            res += tmp !== undefined ? tmp : "null";
            if (value.length - 1 > maximumBreadth) {
              const removedKeys = value.length - maximumBreadth - 1;
              res += `${join}"... ${getItemCount(removedKeys)} not stringified"`;
            }
            if (spacer !== "") {
              res += `
${originalIndentation}`;
            }
            stack.pop();
            return `[${res}]`;
          }
          let keys = Object.keys(value);
          const keyLength = keys.length;
          if (keyLength === 0) {
            return "{}";
          }
          if (maximumDepth < stack.length + 1) {
            return '"[Object]"';
          }
          let whitespace = "";
          let separator = "";
          if (spacer !== "") {
            indentation += spacer;
            join = `,
${indentation}`;
            whitespace = " ";
          }
          const maximumPropertiesToStringify = Math.min(keyLength, maximumBreadth);
          if (deterministic && !isTypedArrayWithEntries(value)) {
            keys = sort(keys, comparator);
          }
          stack.push(value);
          for (let i = 0;i < maximumPropertiesToStringify; i++) {
            const key2 = keys[i];
            const tmp = stringifyFnReplacer(key2, value, stack, replacer, spacer, indentation);
            if (tmp !== undefined) {
              res += `${separator}${strEscape(key2)}:${whitespace}${tmp}`;
              separator = join;
            }
          }
          if (keyLength > maximumBreadth) {
            const removedKeys = keyLength - maximumBreadth;
            res += `${separator}"...":${whitespace}"${getItemCount(removedKeys)} not stringified"`;
            separator = join;
          }
          if (spacer !== "" && separator.length > 1) {
            res = `
${indentation}${res}
${originalIndentation}`;
          }
          stack.pop();
          return `{${res}}`;
        }
        case "number":
          return isFinite(value) ? String(value) : fail ? fail(value) : "null";
        case "boolean":
          return value === true ? "true" : "false";
        case "undefined":
          return;
        case "bigint":
          if (bigint) {
            return String(value);
          }
        default:
          return fail ? fail(value) : undefined;
      }
    }
    function stringifyArrayReplacer(key, value, stack, replacer, spacer, indentation) {
      if (typeof value === "object" && value !== null && typeof value.toJSON === "function") {
        value = value.toJSON(key);
      }
      switch (typeof value) {
        case "string":
          return strEscape(value);
        case "object": {
          if (value === null) {
            return "null";
          }
          if (stack.indexOf(value) !== -1) {
            return circularValue;
          }
          const originalIndentation = indentation;
          let res = "";
          let join = ",";
          if (Array.isArray(value)) {
            if (value.length === 0) {
              return "[]";
            }
            if (maximumDepth < stack.length + 1) {
              return '"[Array]"';
            }
            stack.push(value);
            if (spacer !== "") {
              indentation += spacer;
              res += `
${indentation}`;
              join = `,
${indentation}`;
            }
            const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
            let i = 0;
            for (;i < maximumValuesToStringify - 1; i++) {
              const tmp2 = stringifyArrayReplacer(String(i), value[i], stack, replacer, spacer, indentation);
              res += tmp2 !== undefined ? tmp2 : "null";
              res += join;
            }
            const tmp = stringifyArrayReplacer(String(i), value[i], stack, replacer, spacer, indentation);
            res += tmp !== undefined ? tmp : "null";
            if (value.length - 1 > maximumBreadth) {
              const removedKeys = value.length - maximumBreadth - 1;
              res += `${join}"... ${getItemCount(removedKeys)} not stringified"`;
            }
            if (spacer !== "") {
              res += `
${originalIndentation}`;
            }
            stack.pop();
            return `[${res}]`;
          }
          stack.push(value);
          let whitespace = "";
          if (spacer !== "") {
            indentation += spacer;
            join = `,
${indentation}`;
            whitespace = " ";
          }
          let separator = "";
          for (const key2 of replacer) {
            const tmp = stringifyArrayReplacer(key2, value[key2], stack, replacer, spacer, indentation);
            if (tmp !== undefined) {
              res += `${separator}${strEscape(key2)}:${whitespace}${tmp}`;
              separator = join;
            }
          }
          if (spacer !== "" && separator.length > 1) {
            res = `
${indentation}${res}
${originalIndentation}`;
          }
          stack.pop();
          return `{${res}}`;
        }
        case "number":
          return isFinite(value) ? String(value) : fail ? fail(value) : "null";
        case "boolean":
          return value === true ? "true" : "false";
        case "undefined":
          return;
        case "bigint":
          if (bigint) {
            return String(value);
          }
        default:
          return fail ? fail(value) : undefined;
      }
    }
    function stringifyIndent(key, value, stack, spacer, indentation) {
      switch (typeof value) {
        case "string":
          return strEscape(value);
        case "object": {
          if (value === null) {
            return "null";
          }
          if (typeof value.toJSON === "function") {
            value = value.toJSON(key);
            if (typeof value !== "object") {
              return stringifyIndent(key, value, stack, spacer, indentation);
            }
            if (value === null) {
              return "null";
            }
          }
          if (stack.indexOf(value) !== -1) {
            return circularValue;
          }
          const originalIndentation = indentation;
          if (Array.isArray(value)) {
            if (value.length === 0) {
              return "[]";
            }
            if (maximumDepth < stack.length + 1) {
              return '"[Array]"';
            }
            stack.push(value);
            indentation += spacer;
            let res2 = `
${indentation}`;
            const join2 = `,
${indentation}`;
            const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
            let i = 0;
            for (;i < maximumValuesToStringify - 1; i++) {
              const tmp2 = stringifyIndent(String(i), value[i], stack, spacer, indentation);
              res2 += tmp2 !== undefined ? tmp2 : "null";
              res2 += join2;
            }
            const tmp = stringifyIndent(String(i), value[i], stack, spacer, indentation);
            res2 += tmp !== undefined ? tmp : "null";
            if (value.length - 1 > maximumBreadth) {
              const removedKeys = value.length - maximumBreadth - 1;
              res2 += `${join2}"... ${getItemCount(removedKeys)} not stringified"`;
            }
            res2 += `
${originalIndentation}`;
            stack.pop();
            return `[${res2}]`;
          }
          let keys = Object.keys(value);
          const keyLength = keys.length;
          if (keyLength === 0) {
            return "{}";
          }
          if (maximumDepth < stack.length + 1) {
            return '"[Object]"';
          }
          indentation += spacer;
          const join = `,
${indentation}`;
          let res = "";
          let separator = "";
          let maximumPropertiesToStringify = Math.min(keyLength, maximumBreadth);
          if (isTypedArrayWithEntries(value)) {
            res += stringifyTypedArray(value, join, maximumBreadth);
            keys = keys.slice(value.length);
            maximumPropertiesToStringify -= value.length;
            separator = join;
          }
          if (deterministic) {
            keys = sort(keys, comparator);
          }
          stack.push(value);
          for (let i = 0;i < maximumPropertiesToStringify; i++) {
            const key2 = keys[i];
            const tmp = stringifyIndent(key2, value[key2], stack, spacer, indentation);
            if (tmp !== undefined) {
              res += `${separator}${strEscape(key2)}: ${tmp}`;
              separator = join;
            }
          }
          if (keyLength > maximumBreadth) {
            const removedKeys = keyLength - maximumBreadth;
            res += `${separator}"...": "${getItemCount(removedKeys)} not stringified"`;
            separator = join;
          }
          if (separator !== "") {
            res = `
${indentation}${res}
${originalIndentation}`;
          }
          stack.pop();
          return `{${res}}`;
        }
        case "number":
          return isFinite(value) ? String(value) : fail ? fail(value) : "null";
        case "boolean":
          return value === true ? "true" : "false";
        case "undefined":
          return;
        case "bigint":
          if (bigint) {
            return String(value);
          }
        default:
          return fail ? fail(value) : undefined;
      }
    }
    function stringifySimple(key, value, stack) {
      switch (typeof value) {
        case "string":
          return strEscape(value);
        case "object": {
          if (value === null) {
            return "null";
          }
          if (typeof value.toJSON === "function") {
            value = value.toJSON(key);
            if (typeof value !== "object") {
              return stringifySimple(key, value, stack);
            }
            if (value === null) {
              return "null";
            }
          }
          if (stack.indexOf(value) !== -1) {
            return circularValue;
          }
          let res = "";
          const hasLength = value.length !== undefined;
          if (hasLength && Array.isArray(value)) {
            if (value.length === 0) {
              return "[]";
            }
            if (maximumDepth < stack.length + 1) {
              return '"[Array]"';
            }
            stack.push(value);
            const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
            let i = 0;
            for (;i < maximumValuesToStringify - 1; i++) {
              const tmp2 = stringifySimple(String(i), value[i], stack);
              res += tmp2 !== undefined ? tmp2 : "null";
              res += ",";
            }
            const tmp = stringifySimple(String(i), value[i], stack);
            res += tmp !== undefined ? tmp : "null";
            if (value.length - 1 > maximumBreadth) {
              const removedKeys = value.length - maximumBreadth - 1;
              res += `,"... ${getItemCount(removedKeys)} not stringified"`;
            }
            stack.pop();
            return `[${res}]`;
          }
          let keys = Object.keys(value);
          const keyLength = keys.length;
          if (keyLength === 0) {
            return "{}";
          }
          if (maximumDepth < stack.length + 1) {
            return '"[Object]"';
          }
          let separator = "";
          let maximumPropertiesToStringify = Math.min(keyLength, maximumBreadth);
          if (hasLength && isTypedArrayWithEntries(value)) {
            res += stringifyTypedArray(value, ",", maximumBreadth);
            keys = keys.slice(value.length);
            maximumPropertiesToStringify -= value.length;
            separator = ",";
          }
          if (deterministic) {
            keys = sort(keys, comparator);
          }
          stack.push(value);
          for (let i = 0;i < maximumPropertiesToStringify; i++) {
            const key2 = keys[i];
            const tmp = stringifySimple(key2, value[key2], stack);
            if (tmp !== undefined) {
              res += `${separator}${strEscape(key2)}:${tmp}`;
              separator = ",";
            }
          }
          if (keyLength > maximumBreadth) {
            const removedKeys = keyLength - maximumBreadth;
            res += `${separator}"...":"${getItemCount(removedKeys)} not stringified"`;
          }
          stack.pop();
          return `{${res}}`;
        }
        case "number":
          return isFinite(value) ? String(value) : fail ? fail(value) : "null";
        case "boolean":
          return value === true ? "true" : "false";
        case "undefined":
          return;
        case "bigint":
          if (bigint) {
            return String(value);
          }
        default:
          return fail ? fail(value) : undefined;
      }
    }
    function stringify2(value, replacer, space) {
      if (arguments.length > 1) {
        let spacer = "";
        if (typeof space === "number") {
          spacer = " ".repeat(Math.min(space, 10));
        } else if (typeof space === "string") {
          spacer = space.slice(0, 10);
        }
        if (replacer != null) {
          if (typeof replacer === "function") {
            return stringifyFnReplacer("", { "": value }, [], replacer, spacer, "");
          }
          if (Array.isArray(replacer)) {
            return stringifyArrayReplacer("", value, [], getUniqueReplacerSet(replacer), spacer, "");
          }
        }
        if (spacer.length !== 0) {
          return stringifyIndent("", value, [], spacer, "");
        }
      }
      return stringifySimple("", value, []);
    }
    return stringify2;
  }
});

// node_modules/.bun/pino@10.3.1/node_modules/pino/lib/multistream.js
var require_multistream = __commonJS((exports, module) => {
  var metadata = Symbol.for("pino.metadata");
  var { DEFAULT_LEVELS } = require_constants();
  var DEFAULT_INFO_LEVEL = DEFAULT_LEVELS.info;
  function multistream(streamsArray, opts) {
    streamsArray = streamsArray || [];
    opts = opts || { dedupe: false };
    const streamLevels = Object.create(DEFAULT_LEVELS);
    streamLevels.silent = Infinity;
    if (opts.levels && typeof opts.levels === "object") {
      Object.keys(opts.levels).forEach((i) => {
        streamLevels[i] = opts.levels[i];
      });
    }
    const res = {
      write,
      add,
      remove,
      emit,
      flushSync,
      end,
      minLevel: 0,
      lastId: 0,
      streams: [],
      clone,
      [metadata]: true,
      streamLevels
    };
    if (Array.isArray(streamsArray)) {
      streamsArray.forEach(add, res);
    } else {
      add.call(res, streamsArray);
    }
    streamsArray = null;
    return res;
    function write(data) {
      let dest;
      const level = this.lastLevel;
      const { streams } = this;
      let recordedLevel = 0;
      let stream;
      for (let i = initLoopVar(streams.length, opts.dedupe);checkLoopVar(i, streams.length, opts.dedupe); i = adjustLoopVar(i, opts.dedupe)) {
        dest = streams[i];
        if (dest.level <= level) {
          if (recordedLevel !== 0 && recordedLevel !== dest.level) {
            break;
          }
          stream = dest.stream;
          if (stream[metadata]) {
            const { lastTime, lastMsg, lastObj, lastLogger } = this;
            stream.lastLevel = level;
            stream.lastTime = lastTime;
            stream.lastMsg = lastMsg;
            stream.lastObj = lastObj;
            stream.lastLogger = lastLogger;
          }
          stream.write(data);
          if (opts.dedupe) {
            recordedLevel = dest.level;
          }
        } else if (!opts.dedupe) {
          break;
        }
      }
    }
    function emit(...args) {
      for (const { stream } of this.streams) {
        if (typeof stream.emit === "function") {
          stream.emit(...args);
        }
      }
    }
    function flushSync() {
      for (const { stream } of this.streams) {
        if (typeof stream.flushSync === "function") {
          stream.flushSync();
        }
      }
    }
    function add(dest) {
      if (!dest) {
        return res;
      }
      const isStream = typeof dest.write === "function" || dest.stream;
      const stream_ = dest.write ? dest : dest.stream;
      if (!isStream) {
        throw Error("stream object needs to implement either StreamEntry or DestinationStream interface");
      }
      const { streams, streamLevels: streamLevels2 } = this;
      let level;
      if (typeof dest.levelVal === "number") {
        level = dest.levelVal;
      } else if (typeof dest.level === "string") {
        level = streamLevels2[dest.level];
      } else if (typeof dest.level === "number") {
        level = dest.level;
      } else {
        level = DEFAULT_INFO_LEVEL;
      }
      const dest_ = {
        stream: stream_,
        level,
        levelVal: undefined,
        id: ++res.lastId
      };
      streams.unshift(dest_);
      streams.sort(compareByLevel);
      this.minLevel = streams[0].level;
      return res;
    }
    function remove(id) {
      const { streams } = this;
      const index = streams.findIndex((s) => s.id === id);
      if (index >= 0) {
        streams.splice(index, 1);
        streams.sort(compareByLevel);
        this.minLevel = streams.length > 0 ? streams[0].level : -1;
      }
      return res;
    }
    function end() {
      for (const { stream } of this.streams) {
        if (typeof stream.flushSync === "function") {
          stream.flushSync();
        }
        stream.end();
      }
    }
    function clone(level) {
      const streams = new Array(this.streams.length);
      for (let i = 0;i < streams.length; i++) {
        streams[i] = {
          level,
          stream: this.streams[i].stream
        };
      }
      return {
        write,
        add,
        remove,
        minLevel: level,
        streams,
        clone,
        emit,
        flushSync,
        [metadata]: true
      };
    }
  }
  function compareByLevel(a, b) {
    return a.level - b.level;
  }
  function initLoopVar(length, dedupe) {
    return dedupe ? length - 1 : 0;
  }
  function adjustLoopVar(i, dedupe) {
    return dedupe ? i - 1 : i + 1;
  }
  function checkLoopVar(i, length, dedupe) {
    return dedupe ? i >= 0 : i < length;
  }
  module.exports = multistream;
});

// node_modules/.bun/pino@10.3.1/node_modules/pino/pino.js
var require_pino = __commonJS((exports, module) => {
  var os = __require("os");
  var stdSerializers = require_pino_std_serializers();
  var caller = require_caller();
  var redaction = require_redaction();
  var time = require_time();
  var proto = require_proto();
  var symbols = require_symbols();
  var { configure } = require_safe_stable_stringify();
  var { assertDefaultLevelFound, mappings, genLsCache, genLevelComparison, assertLevelComparison } = require_levels();
  var { DEFAULT_LEVELS, SORTING_ORDER } = require_constants();
  var {
    createArgsNormalizer,
    asChindings,
    buildSafeSonicBoom,
    buildFormatters,
    stringify,
    normalizeDestFileDescriptor,
    noop
  } = require_tools();
  var { version } = require_meta();
  var {
    chindingsSym,
    redactFmtSym,
    serializersSym,
    timeSym,
    timeSliceIndexSym,
    streamSym,
    stringifySym,
    stringifySafeSym,
    stringifiersSym,
    setLevelSym,
    endSym,
    formatOptsSym,
    messageKeySym,
    errorKeySym,
    nestedKeySym,
    mixinSym,
    levelCompSym,
    useOnlyCustomLevelsSym,
    formattersSym,
    hooksSym,
    nestedKeyStrSym,
    mixinMergeStrategySym,
    msgPrefixSym
  } = symbols;
  var { epochTime, nullTime } = time;
  var { pid } = process;
  var hostname = os.hostname();
  var defaultErrorSerializer = stdSerializers.err;
  var defaultOptions = {
    level: "info",
    levelComparison: SORTING_ORDER.ASC,
    levels: DEFAULT_LEVELS,
    messageKey: "msg",
    errorKey: "err",
    nestedKey: null,
    enabled: true,
    base: { pid, hostname },
    serializers: Object.assign(Object.create(null), {
      err: defaultErrorSerializer
    }),
    formatters: Object.assign(Object.create(null), {
      bindings(bindings) {
        return bindings;
      },
      level(label, number) {
        return { level: number };
      }
    }),
    hooks: {
      logMethod: undefined,
      streamWrite: undefined
    },
    timestamp: epochTime,
    name: undefined,
    redact: null,
    customLevels: null,
    useOnlyCustomLevels: false,
    depthLimit: 5,
    edgeLimit: 100
  };
  var normalize = createArgsNormalizer(defaultOptions);
  var serializers = Object.assign(Object.create(null), stdSerializers);
  function pino(...args) {
    const instance = {};
    const { opts, stream } = normalize(instance, caller(), ...args);
    if (opts.level && typeof opts.level === "string" && DEFAULT_LEVELS[opts.level.toLowerCase()] !== undefined)
      opts.level = opts.level.toLowerCase();
    const {
      redact,
      crlf,
      serializers: serializers2,
      timestamp,
      messageKey,
      errorKey,
      nestedKey,
      base,
      name,
      level,
      customLevels,
      levelComparison,
      mixin,
      mixinMergeStrategy,
      useOnlyCustomLevels,
      formatters,
      hooks,
      depthLimit,
      edgeLimit,
      onChild,
      msgPrefix
    } = opts;
    const stringifySafe = configure({
      maximumDepth: depthLimit,
      maximumBreadth: edgeLimit
    });
    const allFormatters = buildFormatters(formatters.level, formatters.bindings, formatters.log);
    const stringifyFn = stringify.bind({
      [stringifySafeSym]: stringifySafe
    });
    const stringifiers = redact ? redaction(redact, stringifyFn) : {};
    const formatOpts = redact ? { stringify: stringifiers[redactFmtSym] } : { stringify: stringifyFn };
    const end = "}" + (crlf ? `\r
` : `
`);
    const coreChindings = asChindings.bind(null, {
      [chindingsSym]: "",
      [serializersSym]: serializers2,
      [stringifiersSym]: stringifiers,
      [stringifySym]: stringify,
      [stringifySafeSym]: stringifySafe,
      [formattersSym]: allFormatters
    });
    let chindings = "";
    if (base !== null) {
      if (name === undefined) {
        chindings = coreChindings(base);
      } else {
        chindings = coreChindings(Object.assign({}, base, { name }));
      }
    }
    const time2 = timestamp instanceof Function ? timestamp : timestamp ? epochTime : nullTime;
    const timeSliceIndex = time2().indexOf(":") + 1;
    if (useOnlyCustomLevels && !customLevels)
      throw Error("customLevels is required if useOnlyCustomLevels is set true");
    if (mixin && typeof mixin !== "function")
      throw Error(`Unknown mixin type "${typeof mixin}" - expected "function"`);
    if (msgPrefix && typeof msgPrefix !== "string")
      throw Error(`Unknown msgPrefix type "${typeof msgPrefix}" - expected "string"`);
    assertDefaultLevelFound(level, customLevels, useOnlyCustomLevels);
    const levels = mappings(customLevels, useOnlyCustomLevels);
    if (typeof stream.emit === "function") {
      stream.emit("message", { code: "PINO_CONFIG", config: { levels, messageKey, errorKey } });
    }
    assertLevelComparison(levelComparison);
    const levelCompFunc = genLevelComparison(levelComparison);
    Object.assign(instance, {
      levels,
      [levelCompSym]: levelCompFunc,
      [useOnlyCustomLevelsSym]: useOnlyCustomLevels,
      [streamSym]: stream,
      [timeSym]: time2,
      [timeSliceIndexSym]: timeSliceIndex,
      [stringifySym]: stringify,
      [stringifySafeSym]: stringifySafe,
      [stringifiersSym]: stringifiers,
      [endSym]: end,
      [formatOptsSym]: formatOpts,
      [messageKeySym]: messageKey,
      [errorKeySym]: errorKey,
      [nestedKeySym]: nestedKey,
      [nestedKeyStrSym]: nestedKey ? `,${JSON.stringify(nestedKey)}:{` : "",
      [serializersSym]: serializers2,
      [mixinSym]: mixin,
      [mixinMergeStrategySym]: mixinMergeStrategy,
      [chindingsSym]: chindings,
      [formattersSym]: allFormatters,
      [hooksSym]: hooks,
      silent: noop,
      onChild,
      [msgPrefixSym]: msgPrefix
    });
    Object.setPrototypeOf(instance, proto());
    genLsCache(instance);
    instance[setLevelSym](level);
    return instance;
  }
  module.exports = pino;
  module.exports.destination = (dest = process.stdout.fd) => {
    if (typeof dest === "object") {
      dest.dest = normalizeDestFileDescriptor(dest.dest || process.stdout.fd);
      return buildSafeSonicBoom(dest);
    } else {
      return buildSafeSonicBoom({ dest: normalizeDestFileDescriptor(dest), minLength: 0 });
    }
  };
  module.exports.transport = require_transport();
  module.exports.multistream = require_multistream();
  module.exports.levels = mappings();
  module.exports.stdSerializers = serializers;
  module.exports.stdTimeFunctions = Object.assign({}, time);
  module.exports.symbols = symbols;
  module.exports.version = version;
  module.exports.default = pino;
  module.exports.pino = pino;
});

// node_modules/.bun/@ioredis+commands@1.5.1/node_modules/@ioredis/commands/built/commands.json
var require_commands = __commonJS((exports, module) => {
  module.exports = {
    acl: {
      arity: -2,
      flags: [],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    append: {
      arity: 3,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    asking: {
      arity: 1,
      flags: [
        "fast"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    auth: {
      arity: -2,
      flags: [
        "noscript",
        "loading",
        "stale",
        "fast",
        "no_auth",
        "allow_busy"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    bgrewriteaof: {
      arity: 1,
      flags: [
        "admin",
        "noscript",
        "no_async_loading"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    bgsave: {
      arity: -1,
      flags: [
        "admin",
        "noscript",
        "no_async_loading"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    bitcount: {
      arity: -2,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    bitfield: {
      arity: -2,
      flags: [
        "write",
        "denyoom"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    bitfield_ro: {
      arity: -2,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    bitop: {
      arity: -4,
      flags: [
        "write",
        "denyoom"
      ],
      keyStart: 2,
      keyStop: -1,
      step: 1
    },
    bitpos: {
      arity: -3,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    blmove: {
      arity: 6,
      flags: [
        "write",
        "denyoom",
        "noscript",
        "blocking"
      ],
      keyStart: 1,
      keyStop: 2,
      step: 1
    },
    blmpop: {
      arity: -5,
      flags: [
        "write",
        "blocking",
        "movablekeys"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    blpop: {
      arity: -3,
      flags: [
        "write",
        "noscript",
        "blocking"
      ],
      keyStart: 1,
      keyStop: -2,
      step: 1
    },
    brpop: {
      arity: -3,
      flags: [
        "write",
        "noscript",
        "blocking"
      ],
      keyStart: 1,
      keyStop: -2,
      step: 1
    },
    brpoplpush: {
      arity: 4,
      flags: [
        "write",
        "denyoom",
        "noscript",
        "blocking"
      ],
      keyStart: 1,
      keyStop: 2,
      step: 1
    },
    bzmpop: {
      arity: -5,
      flags: [
        "write",
        "blocking",
        "movablekeys"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    bzpopmax: {
      arity: -3,
      flags: [
        "write",
        "noscript",
        "blocking",
        "fast"
      ],
      keyStart: 1,
      keyStop: -2,
      step: 1
    },
    bzpopmin: {
      arity: -3,
      flags: [
        "write",
        "noscript",
        "blocking",
        "fast"
      ],
      keyStart: 1,
      keyStop: -2,
      step: 1
    },
    client: {
      arity: -2,
      flags: [],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    cluster: {
      arity: -2,
      flags: [],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    command: {
      arity: -1,
      flags: [
        "loading",
        "stale"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    config: {
      arity: -2,
      flags: [],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    copy: {
      arity: -3,
      flags: [
        "write",
        "denyoom"
      ],
      keyStart: 1,
      keyStop: 2,
      step: 1
    },
    dbsize: {
      arity: 1,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    debug: {
      arity: -2,
      flags: [
        "admin",
        "noscript",
        "loading",
        "stale"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    decr: {
      arity: 2,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    decrby: {
      arity: 3,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    del: {
      arity: -2,
      flags: [
        "write"
      ],
      keyStart: 1,
      keyStop: -1,
      step: 1
    },
    discard: {
      arity: 1,
      flags: [
        "noscript",
        "loading",
        "stale",
        "fast",
        "allow_busy"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    dump: {
      arity: 2,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    echo: {
      arity: 2,
      flags: [
        "fast"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    eval: {
      arity: -3,
      flags: [
        "noscript",
        "stale",
        "skip_monitor",
        "no_mandatory_keys",
        "movablekeys"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    eval_ro: {
      arity: -3,
      flags: [
        "readonly",
        "noscript",
        "stale",
        "skip_monitor",
        "no_mandatory_keys",
        "movablekeys"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    evalsha: {
      arity: -3,
      flags: [
        "noscript",
        "stale",
        "skip_monitor",
        "no_mandatory_keys",
        "movablekeys"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    evalsha_ro: {
      arity: -3,
      flags: [
        "readonly",
        "noscript",
        "stale",
        "skip_monitor",
        "no_mandatory_keys",
        "movablekeys"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    exec: {
      arity: 1,
      flags: [
        "noscript",
        "loading",
        "stale",
        "skip_slowlog"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    exists: {
      arity: -2,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: -1,
      step: 1
    },
    expire: {
      arity: -3,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    expireat: {
      arity: -3,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    expiretime: {
      arity: 2,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    failover: {
      arity: -1,
      flags: [
        "admin",
        "noscript",
        "stale"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    fcall: {
      arity: -3,
      flags: [
        "noscript",
        "stale",
        "skip_monitor",
        "no_mandatory_keys",
        "movablekeys"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    fcall_ro: {
      arity: -3,
      flags: [
        "readonly",
        "noscript",
        "stale",
        "skip_monitor",
        "no_mandatory_keys",
        "movablekeys"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    flushall: {
      arity: -1,
      flags: [
        "write"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    flushdb: {
      arity: -1,
      flags: [
        "write"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    function: {
      arity: -2,
      flags: [],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    geoadd: {
      arity: -5,
      flags: [
        "write",
        "denyoom"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    geodist: {
      arity: -4,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    geohash: {
      arity: -2,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    geopos: {
      arity: -2,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    georadius: {
      arity: -6,
      flags: [
        "write",
        "denyoom",
        "movablekeys"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    georadius_ro: {
      arity: -6,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    georadiusbymember: {
      arity: -5,
      flags: [
        "write",
        "denyoom",
        "movablekeys"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    georadiusbymember_ro: {
      arity: -5,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    geosearch: {
      arity: -7,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    geosearchstore: {
      arity: -8,
      flags: [
        "write",
        "denyoom"
      ],
      keyStart: 1,
      keyStop: 2,
      step: 1
    },
    get: {
      arity: 2,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    getbit: {
      arity: 3,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    getdel: {
      arity: 2,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    getex: {
      arity: -2,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    getrange: {
      arity: 4,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    getset: {
      arity: 3,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hdel: {
      arity: -3,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hello: {
      arity: -1,
      flags: [
        "noscript",
        "loading",
        "stale",
        "fast",
        "no_auth",
        "allow_busy"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    hexists: {
      arity: 3,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hexpire: {
      arity: -6,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hexpireat: {
      arity: -6,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hexpiretime: {
      arity: -5,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hget: {
      arity: 3,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hgetall: {
      arity: 2,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hgetdel: {
      arity: -5,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hgetex: {
      arity: -5,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hincrby: {
      arity: 4,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hincrbyfloat: {
      arity: 4,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hkeys: {
      arity: 2,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hlen: {
      arity: 2,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hmget: {
      arity: -3,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hmset: {
      arity: -4,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hpersist: {
      arity: -5,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hpexpire: {
      arity: -6,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hpexpireat: {
      arity: -6,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hpexpiretime: {
      arity: -5,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hpttl: {
      arity: -5,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hrandfield: {
      arity: -2,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hscan: {
      arity: -3,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hset: {
      arity: -4,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hsetex: {
      arity: -6,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hsetnx: {
      arity: 4,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hstrlen: {
      arity: 3,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    httl: {
      arity: -5,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    hvals: {
      arity: 2,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    incr: {
      arity: 2,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    incrby: {
      arity: 3,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    incrbyfloat: {
      arity: 3,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    info: {
      arity: -1,
      flags: [
        "loading",
        "stale"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    keys: {
      arity: 2,
      flags: [
        "readonly"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    lastsave: {
      arity: 1,
      flags: [
        "loading",
        "stale",
        "fast"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    latency: {
      arity: -2,
      flags: [],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    lcs: {
      arity: -3,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 2,
      step: 1
    },
    lindex: {
      arity: 3,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    linsert: {
      arity: 5,
      flags: [
        "write",
        "denyoom"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    llen: {
      arity: 2,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    lmove: {
      arity: 5,
      flags: [
        "write",
        "denyoom"
      ],
      keyStart: 1,
      keyStop: 2,
      step: 1
    },
    lmpop: {
      arity: -4,
      flags: [
        "write",
        "movablekeys"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    lolwut: {
      arity: -1,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    lpop: {
      arity: -2,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    lpos: {
      arity: -3,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    lpush: {
      arity: -3,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    lpushx: {
      arity: -3,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    lrange: {
      arity: 4,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    lrem: {
      arity: 4,
      flags: [
        "write"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    lset: {
      arity: 4,
      flags: [
        "write",
        "denyoom"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    ltrim: {
      arity: 4,
      flags: [
        "write"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    memory: {
      arity: -2,
      flags: [],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    mget: {
      arity: -2,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: -1,
      step: 1
    },
    migrate: {
      arity: -6,
      flags: [
        "write",
        "movablekeys"
      ],
      keyStart: 3,
      keyStop: 3,
      step: 1
    },
    module: {
      arity: -2,
      flags: [],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    monitor: {
      arity: 1,
      flags: [
        "admin",
        "noscript",
        "loading",
        "stale"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    move: {
      arity: 3,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    mset: {
      arity: -3,
      flags: [
        "write",
        "denyoom"
      ],
      keyStart: 1,
      keyStop: -1,
      step: 2
    },
    msetnx: {
      arity: -3,
      flags: [
        "write",
        "denyoom"
      ],
      keyStart: 1,
      keyStop: -1,
      step: 2
    },
    multi: {
      arity: 1,
      flags: [
        "noscript",
        "loading",
        "stale",
        "fast",
        "allow_busy"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    object: {
      arity: -2,
      flags: [],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    persist: {
      arity: 2,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    pexpire: {
      arity: -3,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    pexpireat: {
      arity: -3,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    pexpiretime: {
      arity: 2,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    pfadd: {
      arity: -2,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    pfcount: {
      arity: -2,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: -1,
      step: 1
    },
    pfdebug: {
      arity: 3,
      flags: [
        "write",
        "denyoom",
        "admin"
      ],
      keyStart: 2,
      keyStop: 2,
      step: 1
    },
    pfmerge: {
      arity: -2,
      flags: [
        "write",
        "denyoom"
      ],
      keyStart: 1,
      keyStop: -1,
      step: 1
    },
    pfselftest: {
      arity: 1,
      flags: [
        "admin"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    ping: {
      arity: -1,
      flags: [
        "fast"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    psetex: {
      arity: 4,
      flags: [
        "write",
        "denyoom"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    psubscribe: {
      arity: -2,
      flags: [
        "pubsub",
        "noscript",
        "loading",
        "stale"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    psync: {
      arity: -3,
      flags: [
        "admin",
        "noscript",
        "no_async_loading",
        "no_multi"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    pttl: {
      arity: 2,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    publish: {
      arity: 3,
      flags: [
        "pubsub",
        "loading",
        "stale",
        "fast"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    pubsub: {
      arity: -2,
      flags: [],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    punsubscribe: {
      arity: -1,
      flags: [
        "pubsub",
        "noscript",
        "loading",
        "stale"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    quit: {
      arity: -1,
      flags: [
        "noscript",
        "loading",
        "stale",
        "fast",
        "no_auth",
        "allow_busy"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    randomkey: {
      arity: 1,
      flags: [
        "readonly"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    readonly: {
      arity: 1,
      flags: [
        "loading",
        "stale",
        "fast"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    readwrite: {
      arity: 1,
      flags: [
        "loading",
        "stale",
        "fast"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    rename: {
      arity: 3,
      flags: [
        "write"
      ],
      keyStart: 1,
      keyStop: 2,
      step: 1
    },
    renamenx: {
      arity: 3,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 2,
      step: 1
    },
    replconf: {
      arity: -1,
      flags: [
        "admin",
        "noscript",
        "loading",
        "stale",
        "allow_busy"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    replicaof: {
      arity: 3,
      flags: [
        "admin",
        "noscript",
        "stale",
        "no_async_loading"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    reset: {
      arity: 1,
      flags: [
        "noscript",
        "loading",
        "stale",
        "fast",
        "no_auth",
        "allow_busy"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    restore: {
      arity: -4,
      flags: [
        "write",
        "denyoom"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    "restore-asking": {
      arity: -4,
      flags: [
        "write",
        "denyoom",
        "asking"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    role: {
      arity: 1,
      flags: [
        "noscript",
        "loading",
        "stale",
        "fast"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    rpop: {
      arity: -2,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    rpoplpush: {
      arity: 3,
      flags: [
        "write",
        "denyoom"
      ],
      keyStart: 1,
      keyStop: 2,
      step: 1
    },
    rpush: {
      arity: -3,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    rpushx: {
      arity: -3,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    sadd: {
      arity: -3,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    save: {
      arity: 1,
      flags: [
        "admin",
        "noscript",
        "no_async_loading",
        "no_multi"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    scan: {
      arity: -2,
      flags: [
        "readonly"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    scard: {
      arity: 2,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    script: {
      arity: -2,
      flags: [],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    sdiff: {
      arity: -2,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: -1,
      step: 1
    },
    sdiffstore: {
      arity: -3,
      flags: [
        "write",
        "denyoom"
      ],
      keyStart: 1,
      keyStop: -1,
      step: 1
    },
    select: {
      arity: 2,
      flags: [
        "loading",
        "stale",
        "fast"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    set: {
      arity: -3,
      flags: [
        "write",
        "denyoom"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    setbit: {
      arity: 4,
      flags: [
        "write",
        "denyoom"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    setex: {
      arity: 4,
      flags: [
        "write",
        "denyoom"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    setnx: {
      arity: 3,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    setrange: {
      arity: 4,
      flags: [
        "write",
        "denyoom"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    shutdown: {
      arity: -1,
      flags: [
        "admin",
        "noscript",
        "loading",
        "stale",
        "no_multi",
        "allow_busy"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    sinter: {
      arity: -2,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: -1,
      step: 1
    },
    sintercard: {
      arity: -3,
      flags: [
        "readonly",
        "movablekeys"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    sinterstore: {
      arity: -3,
      flags: [
        "write",
        "denyoom"
      ],
      keyStart: 1,
      keyStop: -1,
      step: 1
    },
    sismember: {
      arity: 3,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    slaveof: {
      arity: 3,
      flags: [
        "admin",
        "noscript",
        "stale",
        "no_async_loading"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    slowlog: {
      arity: -2,
      flags: [],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    smembers: {
      arity: 2,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    smismember: {
      arity: -3,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    smove: {
      arity: 4,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 2,
      step: 1
    },
    sort: {
      arity: -2,
      flags: [
        "write",
        "denyoom",
        "movablekeys"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    sort_ro: {
      arity: -2,
      flags: [
        "readonly",
        "movablekeys"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    spop: {
      arity: -2,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    spublish: {
      arity: 3,
      flags: [
        "pubsub",
        "loading",
        "stale",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    srandmember: {
      arity: -2,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    srem: {
      arity: -3,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    sscan: {
      arity: -3,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    ssubscribe: {
      arity: -2,
      flags: [
        "pubsub",
        "noscript",
        "loading",
        "stale"
      ],
      keyStart: 1,
      keyStop: -1,
      step: 1
    },
    strlen: {
      arity: 2,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    subscribe: {
      arity: -2,
      flags: [
        "pubsub",
        "noscript",
        "loading",
        "stale"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    substr: {
      arity: 4,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    sunion: {
      arity: -2,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: -1,
      step: 1
    },
    sunionstore: {
      arity: -3,
      flags: [
        "write",
        "denyoom"
      ],
      keyStart: 1,
      keyStop: -1,
      step: 1
    },
    sunsubscribe: {
      arity: -1,
      flags: [
        "pubsub",
        "noscript",
        "loading",
        "stale"
      ],
      keyStart: 1,
      keyStop: -1,
      step: 1
    },
    swapdb: {
      arity: 3,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    sync: {
      arity: 1,
      flags: [
        "admin",
        "noscript",
        "no_async_loading",
        "no_multi"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    time: {
      arity: 1,
      flags: [
        "loading",
        "stale",
        "fast"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    touch: {
      arity: -2,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: -1,
      step: 1
    },
    ttl: {
      arity: 2,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    type: {
      arity: 2,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    unlink: {
      arity: -2,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: -1,
      step: 1
    },
    unsubscribe: {
      arity: -1,
      flags: [
        "pubsub",
        "noscript",
        "loading",
        "stale"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    unwatch: {
      arity: 1,
      flags: [
        "noscript",
        "loading",
        "stale",
        "fast",
        "allow_busy"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    wait: {
      arity: 3,
      flags: [
        "noscript"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    watch: {
      arity: -2,
      flags: [
        "noscript",
        "loading",
        "stale",
        "fast",
        "allow_busy"
      ],
      keyStart: 1,
      keyStop: -1,
      step: 1
    },
    xack: {
      arity: -4,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    xadd: {
      arity: -5,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    xautoclaim: {
      arity: -6,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    xclaim: {
      arity: -6,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    xdel: {
      arity: -3,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    xdelex: {
      arity: -5,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    xgroup: {
      arity: -2,
      flags: [],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    xinfo: {
      arity: -2,
      flags: [],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    xlen: {
      arity: 2,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    xpending: {
      arity: -3,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    xrange: {
      arity: -4,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    xread: {
      arity: -4,
      flags: [
        "readonly",
        "blocking",
        "movablekeys"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    xreadgroup: {
      arity: -7,
      flags: [
        "write",
        "blocking",
        "movablekeys"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    xrevrange: {
      arity: -4,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    xsetid: {
      arity: -3,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    xtrim: {
      arity: -4,
      flags: [
        "write"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zadd: {
      arity: -4,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zcard: {
      arity: 2,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zcount: {
      arity: 4,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zdiff: {
      arity: -3,
      flags: [
        "readonly",
        "movablekeys"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    zdiffstore: {
      arity: -4,
      flags: [
        "write",
        "denyoom",
        "movablekeys"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zincrby: {
      arity: 4,
      flags: [
        "write",
        "denyoom",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zinter: {
      arity: -3,
      flags: [
        "readonly",
        "movablekeys"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    zintercard: {
      arity: -3,
      flags: [
        "readonly",
        "movablekeys"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    zinterstore: {
      arity: -4,
      flags: [
        "write",
        "denyoom",
        "movablekeys"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zlexcount: {
      arity: 4,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zmpop: {
      arity: -4,
      flags: [
        "write",
        "movablekeys"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    zmscore: {
      arity: -3,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zpopmax: {
      arity: -2,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zpopmin: {
      arity: -2,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zrandmember: {
      arity: -2,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zrange: {
      arity: -4,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zrangebylex: {
      arity: -4,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zrangebyscore: {
      arity: -4,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zrangestore: {
      arity: -5,
      flags: [
        "write",
        "denyoom"
      ],
      keyStart: 1,
      keyStop: 2,
      step: 1
    },
    zrank: {
      arity: 3,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zrem: {
      arity: -3,
      flags: [
        "write",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zremrangebylex: {
      arity: 4,
      flags: [
        "write"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zremrangebyrank: {
      arity: 4,
      flags: [
        "write"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zremrangebyscore: {
      arity: 4,
      flags: [
        "write"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zrevrange: {
      arity: -4,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zrevrangebylex: {
      arity: -4,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zrevrangebyscore: {
      arity: -4,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zrevrank: {
      arity: 3,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zscan: {
      arity: -3,
      flags: [
        "readonly"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zscore: {
      arity: 3,
      flags: [
        "readonly",
        "fast"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    },
    zunion: {
      arity: -3,
      flags: [
        "readonly",
        "movablekeys"
      ],
      keyStart: 0,
      keyStop: 0,
      step: 0
    },
    zunionstore: {
      arity: -4,
      flags: [
        "write",
        "denyoom",
        "movablekeys"
      ],
      keyStart: 1,
      keyStop: 1,
      step: 1
    }
  };
});

// node_modules/.bun/@ioredis+commands@1.5.1/node_modules/@ioredis/commands/built/index.js
var require_built = __commonJS((exports) => {
  var __importDefault = exports && exports.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.getKeyIndexes = exports.hasFlag = exports.exists = exports.list = undefined;
  var commands_json_1 = __importDefault(require_commands());
  exports.list = Object.keys(commands_json_1.default);
  var flags = {};
  exports.list.forEach((commandName) => {
    flags[commandName] = commands_json_1.default[commandName].flags.reduce(function(flags2, flag) {
      flags2[flag] = true;
      return flags2;
    }, {});
  });
  function exists(commandName, options) {
    commandName = (options === null || options === undefined ? undefined : options.caseInsensitive) ? String(commandName).toLowerCase() : commandName;
    return Boolean(commands_json_1.default[commandName]);
  }
  exports.exists = exists;
  function hasFlag(commandName, flag, options) {
    commandName = (options === null || options === undefined ? undefined : options.nameCaseInsensitive) ? String(commandName).toLowerCase() : commandName;
    if (!flags[commandName]) {
      throw new Error("Unknown command " + commandName);
    }
    return Boolean(flags[commandName][flag]);
  }
  exports.hasFlag = hasFlag;
  function getKeyIndexes(commandName, args, options) {
    commandName = (options === null || options === undefined ? undefined : options.nameCaseInsensitive) ? String(commandName).toLowerCase() : commandName;
    const command = commands_json_1.default[commandName];
    if (!command) {
      throw new Error("Unknown command " + commandName);
    }
    if (!Array.isArray(args)) {
      throw new Error("Expect args to be an array");
    }
    const keys = [];
    const parseExternalKey = Boolean(options && options.parseExternalKey);
    const takeDynamicKeys = (args2, startIndex) => {
      const keys2 = [];
      const keyStop = Number(args2[startIndex]);
      for (let i = 0;i < keyStop; i++) {
        keys2.push(i + startIndex + 1);
      }
      return keys2;
    };
    const takeKeyAfterToken = (args2, startIndex, token) => {
      for (let i = startIndex;i < args2.length - 1; i += 1) {
        if (String(args2[i]).toLowerCase() === token.toLowerCase()) {
          return i + 1;
        }
      }
      return null;
    };
    switch (commandName) {
      case "zunionstore":
      case "zinterstore":
      case "zdiffstore":
        keys.push(0, ...takeDynamicKeys(args, 1));
        break;
      case "eval":
      case "evalsha":
      case "eval_ro":
      case "evalsha_ro":
      case "fcall":
      case "fcall_ro":
      case "blmpop":
      case "bzmpop":
        keys.push(...takeDynamicKeys(args, 1));
        break;
      case "sintercard":
      case "lmpop":
      case "zunion":
      case "zinter":
      case "zmpop":
      case "zintercard":
      case "zdiff": {
        keys.push(...takeDynamicKeys(args, 0));
        break;
      }
      case "georadius": {
        keys.push(0);
        const storeKey = takeKeyAfterToken(args, 5, "STORE");
        if (storeKey)
          keys.push(storeKey);
        const distKey = takeKeyAfterToken(args, 5, "STOREDIST");
        if (distKey)
          keys.push(distKey);
        break;
      }
      case "georadiusbymember": {
        keys.push(0);
        const storeKey = takeKeyAfterToken(args, 4, "STORE");
        if (storeKey)
          keys.push(storeKey);
        const distKey = takeKeyAfterToken(args, 4, "STOREDIST");
        if (distKey)
          keys.push(distKey);
        break;
      }
      case "sort":
      case "sort_ro":
        keys.push(0);
        for (let i = 1;i < args.length - 1; i++) {
          let arg = args[i];
          if (typeof arg !== "string") {
            continue;
          }
          const directive = arg.toUpperCase();
          if (directive === "GET") {
            i += 1;
            arg = args[i];
            if (arg !== "#") {
              if (parseExternalKey) {
                keys.push([i, getExternalKeyNameLength(arg)]);
              } else {
                keys.push(i);
              }
            }
          } else if (directive === "BY") {
            i += 1;
            if (parseExternalKey) {
              keys.push([i, getExternalKeyNameLength(args[i])]);
            } else {
              keys.push(i);
            }
          } else if (directive === "STORE") {
            i += 1;
            keys.push(i);
          }
        }
        break;
      case "migrate":
        if (args[2] === "") {
          for (let i = 5;i < args.length - 1; i++) {
            const arg = args[i];
            if (typeof arg === "string" && arg.toUpperCase() === "KEYS") {
              for (let j = i + 1;j < args.length; j++) {
                keys.push(j);
              }
              break;
            }
          }
        } else {
          keys.push(2);
        }
        break;
      case "xreadgroup":
      case "xread":
        for (let i = commandName === "xread" ? 0 : 3;i < args.length - 1; i++) {
          if (String(args[i]).toUpperCase() === "STREAMS") {
            for (let j = i + 1;j <= i + (args.length - 1 - i) / 2; j++) {
              keys.push(j);
            }
            break;
          }
        }
        break;
      default:
        if (command.step > 0) {
          const keyStart = command.keyStart - 1;
          const keyStop = command.keyStop > 0 ? command.keyStop : args.length + command.keyStop + 1;
          for (let i = keyStart;i < keyStop; i += command.step) {
            keys.push(i);
          }
        }
        break;
    }
    return keys;
  }
  exports.getKeyIndexes = getKeyIndexes;
  function getExternalKeyNameLength(key) {
    if (typeof key !== "string") {
      key = String(key);
    }
    const hashPos = key.indexOf("->");
    return hashPos === -1 ? key.length : hashPos;
  }
});

// node_modules/.bun/standard-as-callback@2.1.0/node_modules/standard-as-callback/built/utils.js
var require_utils = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.tryCatch = exports.errorObj = undefined;
  exports.errorObj = { e: {} };
  var tryCatchTarget;
  function tryCatcher(err, val) {
    try {
      const target = tryCatchTarget;
      tryCatchTarget = null;
      return target.apply(this, arguments);
    } catch (e) {
      exports.errorObj.e = e;
      return exports.errorObj;
    }
  }
  function tryCatch(fn) {
    tryCatchTarget = fn;
    return tryCatcher;
  }
  exports.tryCatch = tryCatch;
});

// node_modules/.bun/standard-as-callback@2.1.0/node_modules/standard-as-callback/built/index.js
var require_built2 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var utils_1 = require_utils();
  function throwLater(e) {
    setTimeout(function() {
      throw e;
    }, 0);
  }
  function asCallback(promise, nodeback, options) {
    if (typeof nodeback === "function") {
      promise.then((val) => {
        let ret;
        if (options !== undefined && Object(options).spread && Array.isArray(val)) {
          ret = utils_1.tryCatch(nodeback).apply(undefined, [null].concat(val));
        } else {
          ret = val === undefined ? utils_1.tryCatch(nodeback)(null) : utils_1.tryCatch(nodeback)(null, val);
        }
        if (ret === utils_1.errorObj) {
          throwLater(ret.e);
        }
      }, (cause) => {
        if (!cause) {
          const newReason = new Error(cause + "");
          Object.assign(newReason, { cause });
          cause = newReason;
        }
        const ret = utils_1.tryCatch(nodeback)(cause);
        if (ret === utils_1.errorObj) {
          throwLater(ret.e);
        }
      });
    }
    return promise;
  }
  exports.default = asCallback;
});

// node_modules/.bun/redis-errors@1.2.0/node_modules/redis-errors/lib/old.js
var require_old = __commonJS((exports, module) => {
  var assert = __require("assert");
  var util = __require("util");
  function RedisError(message) {
    Object.defineProperty(this, "message", {
      value: message || "",
      configurable: true,
      writable: true
    });
    Error.captureStackTrace(this, this.constructor);
  }
  util.inherits(RedisError, Error);
  Object.defineProperty(RedisError.prototype, "name", {
    value: "RedisError",
    configurable: true,
    writable: true
  });
  function ParserError(message, buffer, offset) {
    assert(buffer);
    assert.strictEqual(typeof offset, "number");
    Object.defineProperty(this, "message", {
      value: message || "",
      configurable: true,
      writable: true
    });
    const tmp = Error.stackTraceLimit;
    Error.stackTraceLimit = 2;
    Error.captureStackTrace(this, this.constructor);
    Error.stackTraceLimit = tmp;
    this.offset = offset;
    this.buffer = buffer;
  }
  util.inherits(ParserError, RedisError);
  Object.defineProperty(ParserError.prototype, "name", {
    value: "ParserError",
    configurable: true,
    writable: true
  });
  function ReplyError(message) {
    Object.defineProperty(this, "message", {
      value: message || "",
      configurable: true,
      writable: true
    });
    const tmp = Error.stackTraceLimit;
    Error.stackTraceLimit = 2;
    Error.captureStackTrace(this, this.constructor);
    Error.stackTraceLimit = tmp;
  }
  util.inherits(ReplyError, RedisError);
  Object.defineProperty(ReplyError.prototype, "name", {
    value: "ReplyError",
    configurable: true,
    writable: true
  });
  function AbortError(message) {
    Object.defineProperty(this, "message", {
      value: message || "",
      configurable: true,
      writable: true
    });
    Error.captureStackTrace(this, this.constructor);
  }
  util.inherits(AbortError, RedisError);
  Object.defineProperty(AbortError.prototype, "name", {
    value: "AbortError",
    configurable: true,
    writable: true
  });
  function InterruptError(message) {
    Object.defineProperty(this, "message", {
      value: message || "",
      configurable: true,
      writable: true
    });
    Error.captureStackTrace(this, this.constructor);
  }
  util.inherits(InterruptError, AbortError);
  Object.defineProperty(InterruptError.prototype, "name", {
    value: "InterruptError",
    configurable: true,
    writable: true
  });
  module.exports = {
    RedisError,
    ParserError,
    ReplyError,
    AbortError,
    InterruptError
  };
});

// node_modules/.bun/redis-errors@1.2.0/node_modules/redis-errors/lib/modern.js
var require_modern = __commonJS((exports, module) => {
  var assert = __require("assert");

  class RedisError extends Error {
    get name() {
      return this.constructor.name;
    }
  }

  class ParserError extends RedisError {
    constructor(message, buffer, offset) {
      assert(buffer);
      assert.strictEqual(typeof offset, "number");
      const tmp = Error.stackTraceLimit;
      Error.stackTraceLimit = 2;
      super(message);
      Error.stackTraceLimit = tmp;
      this.offset = offset;
      this.buffer = buffer;
    }
    get name() {
      return this.constructor.name;
    }
  }

  class ReplyError extends RedisError {
    constructor(message) {
      const tmp = Error.stackTraceLimit;
      Error.stackTraceLimit = 2;
      super(message);
      Error.stackTraceLimit = tmp;
    }
    get name() {
      return this.constructor.name;
    }
  }

  class AbortError extends RedisError {
    get name() {
      return this.constructor.name;
    }
  }

  class InterruptError extends AbortError {
    get name() {
      return this.constructor.name;
    }
  }
  module.exports = {
    RedisError,
    ParserError,
    ReplyError,
    AbortError,
    InterruptError
  };
});

// node_modules/.bun/redis-errors@1.2.0/node_modules/redis-errors/index.js
var require_redis_errors = __commonJS((exports, module) => {
  var Errors = process.version.charCodeAt(1) < 55 && process.version.charCodeAt(2) === 46 ? require_old() : require_modern();
  module.exports = Errors;
});

// node_modules/.bun/cluster-key-slot@1.1.2/node_modules/cluster-key-slot/lib/index.js
var require_lib = __commonJS((exports, module) => {
  var lookup = [
    0,
    4129,
    8258,
    12387,
    16516,
    20645,
    24774,
    28903,
    33032,
    37161,
    41290,
    45419,
    49548,
    53677,
    57806,
    61935,
    4657,
    528,
    12915,
    8786,
    21173,
    17044,
    29431,
    25302,
    37689,
    33560,
    45947,
    41818,
    54205,
    50076,
    62463,
    58334,
    9314,
    13379,
    1056,
    5121,
    25830,
    29895,
    17572,
    21637,
    42346,
    46411,
    34088,
    38153,
    58862,
    62927,
    50604,
    54669,
    13907,
    9842,
    5649,
    1584,
    30423,
    26358,
    22165,
    18100,
    46939,
    42874,
    38681,
    34616,
    63455,
    59390,
    55197,
    51132,
    18628,
    22757,
    26758,
    30887,
    2112,
    6241,
    10242,
    14371,
    51660,
    55789,
    59790,
    63919,
    35144,
    39273,
    43274,
    47403,
    23285,
    19156,
    31415,
    27286,
    6769,
    2640,
    14899,
    10770,
    56317,
    52188,
    64447,
    60318,
    39801,
    35672,
    47931,
    43802,
    27814,
    31879,
    19684,
    23749,
    11298,
    15363,
    3168,
    7233,
    60846,
    64911,
    52716,
    56781,
    44330,
    48395,
    36200,
    40265,
    32407,
    28342,
    24277,
    20212,
    15891,
    11826,
    7761,
    3696,
    65439,
    61374,
    57309,
    53244,
    48923,
    44858,
    40793,
    36728,
    37256,
    33193,
    45514,
    41451,
    53516,
    49453,
    61774,
    57711,
    4224,
    161,
    12482,
    8419,
    20484,
    16421,
    28742,
    24679,
    33721,
    37784,
    41979,
    46042,
    49981,
    54044,
    58239,
    62302,
    689,
    4752,
    8947,
    13010,
    16949,
    21012,
    25207,
    29270,
    46570,
    42443,
    38312,
    34185,
    62830,
    58703,
    54572,
    50445,
    13538,
    9411,
    5280,
    1153,
    29798,
    25671,
    21540,
    17413,
    42971,
    47098,
    34713,
    38840,
    59231,
    63358,
    50973,
    55100,
    9939,
    14066,
    1681,
    5808,
    26199,
    30326,
    17941,
    22068,
    55628,
    51565,
    63758,
    59695,
    39368,
    35305,
    47498,
    43435,
    22596,
    18533,
    30726,
    26663,
    6336,
    2273,
    14466,
    10403,
    52093,
    56156,
    60223,
    64286,
    35833,
    39896,
    43963,
    48026,
    19061,
    23124,
    27191,
    31254,
    2801,
    6864,
    10931,
    14994,
    64814,
    60687,
    56684,
    52557,
    48554,
    44427,
    40424,
    36297,
    31782,
    27655,
    23652,
    19525,
    15522,
    11395,
    7392,
    3265,
    61215,
    65342,
    53085,
    57212,
    44955,
    49082,
    36825,
    40952,
    28183,
    32310,
    20053,
    24180,
    11923,
    16050,
    3793,
    7920
  ];
  var toUTF8Array = function toUTF8Array2(str) {
    var char;
    var i = 0;
    var p = 0;
    var utf8 = [];
    var len = str.length;
    for (;i < len; i++) {
      char = str.charCodeAt(i);
      if (char < 128) {
        utf8[p++] = char;
      } else if (char < 2048) {
        utf8[p++] = char >> 6 | 192;
        utf8[p++] = char & 63 | 128;
      } else if ((char & 64512) === 55296 && i + 1 < str.length && (str.charCodeAt(i + 1) & 64512) === 56320) {
        char = 65536 + ((char & 1023) << 10) + (str.charCodeAt(++i) & 1023);
        utf8[p++] = char >> 18 | 240;
        utf8[p++] = char >> 12 & 63 | 128;
        utf8[p++] = char >> 6 & 63 | 128;
        utf8[p++] = char & 63 | 128;
      } else {
        utf8[p++] = char >> 12 | 224;
        utf8[p++] = char >> 6 & 63 | 128;
        utf8[p++] = char & 63 | 128;
      }
    }
    return utf8;
  };
  var generate = module.exports = function generate2(str) {
    var char;
    var i = 0;
    var start = -1;
    var result = 0;
    var resultHash = 0;
    var utf8 = typeof str === "string" ? toUTF8Array(str) : str;
    var len = utf8.length;
    while (i < len) {
      char = utf8[i++];
      if (start === -1) {
        if (char === 123) {
          start = i;
        }
      } else if (char !== 125) {
        resultHash = lookup[(char ^ resultHash >> 8) & 255] ^ resultHash << 8;
      } else if (i - 1 !== start) {
        return resultHash & 16383;
      }
      result = lookup[(char ^ result >> 8) & 255] ^ result << 8;
    }
    return result & 16383;
  };
  module.exports.generateMulti = function generateMulti(keys) {
    var i = 1;
    var len = keys.length;
    var base = generate(keys[0]);
    while (i < len) {
      if (generate(keys[i++]) !== base)
        return -1;
    }
    return base;
  };
});

// node_modules/.bun/lodash.defaults@4.2.0/node_modules/lodash.defaults/index.js
var require_lodash = __commonJS((exports, module) => {
  var MAX_SAFE_INTEGER = 9007199254740991;
  var argsTag = "[object Arguments]";
  var funcTag = "[object Function]";
  var genTag = "[object GeneratorFunction]";
  var reIsUint = /^(?:0|[1-9]\d*)$/;
  function apply(func, thisArg, args) {
    switch (args.length) {
      case 0:
        return func.call(thisArg);
      case 1:
        return func.call(thisArg, args[0]);
      case 2:
        return func.call(thisArg, args[0], args[1]);
      case 3:
        return func.call(thisArg, args[0], args[1], args[2]);
    }
    return func.apply(thisArg, args);
  }
  function baseTimes(n, iteratee) {
    var index = -1, result = Array(n);
    while (++index < n) {
      result[index] = iteratee(index);
    }
    return result;
  }
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var objectToString = objectProto.toString;
  var propertyIsEnumerable = objectProto.propertyIsEnumerable;
  var nativeMax = Math.max;
  function arrayLikeKeys(value, inherited) {
    var result = isArray(value) || isArguments(value) ? baseTimes(value.length, String) : [];
    var length = result.length, skipIndexes = !!length;
    for (var key in value) {
      if ((inherited || hasOwnProperty.call(value, key)) && !(skipIndexes && (key == "length" || isIndex(key, length)))) {
        result.push(key);
      }
    }
    return result;
  }
  function assignInDefaults(objValue, srcValue, key, object) {
    if (objValue === undefined || eq(objValue, objectProto[key]) && !hasOwnProperty.call(object, key)) {
      return srcValue;
    }
    return objValue;
  }
  function assignValue(object, key, value) {
    var objValue = object[key];
    if (!(hasOwnProperty.call(object, key) && eq(objValue, value)) || value === undefined && !(key in object)) {
      object[key] = value;
    }
  }
  function baseKeysIn(object) {
    if (!isObject(object)) {
      return nativeKeysIn(object);
    }
    var isProto = isPrototype(object), result = [];
    for (var key in object) {
      if (!(key == "constructor" && (isProto || !hasOwnProperty.call(object, key)))) {
        result.push(key);
      }
    }
    return result;
  }
  function baseRest(func, start) {
    start = nativeMax(start === undefined ? func.length - 1 : start, 0);
    return function() {
      var args = arguments, index = -1, length = nativeMax(args.length - start, 0), array = Array(length);
      while (++index < length) {
        array[index] = args[start + index];
      }
      index = -1;
      var otherArgs = Array(start + 1);
      while (++index < start) {
        otherArgs[index] = args[index];
      }
      otherArgs[start] = array;
      return apply(func, this, otherArgs);
    };
  }
  function copyObject(source, props, object, customizer) {
    object || (object = {});
    var index = -1, length = props.length;
    while (++index < length) {
      var key = props[index];
      var newValue = customizer ? customizer(object[key], source[key], key, object, source) : undefined;
      assignValue(object, key, newValue === undefined ? source[key] : newValue);
    }
    return object;
  }
  function createAssigner(assigner) {
    return baseRest(function(object, sources) {
      var index = -1, length = sources.length, customizer = length > 1 ? sources[length - 1] : undefined, guard = length > 2 ? sources[2] : undefined;
      customizer = assigner.length > 3 && typeof customizer == "function" ? (length--, customizer) : undefined;
      if (guard && isIterateeCall(sources[0], sources[1], guard)) {
        customizer = length < 3 ? undefined : customizer;
        length = 1;
      }
      object = Object(object);
      while (++index < length) {
        var source = sources[index];
        if (source) {
          assigner(object, source, index, customizer);
        }
      }
      return object;
    });
  }
  function isIndex(value, length) {
    length = length == null ? MAX_SAFE_INTEGER : length;
    return !!length && (typeof value == "number" || reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
  }
  function isIterateeCall(value, index, object) {
    if (!isObject(object)) {
      return false;
    }
    var type = typeof index;
    if (type == "number" ? isArrayLike(object) && isIndex(index, object.length) : type == "string" && (index in object)) {
      return eq(object[index], value);
    }
    return false;
  }
  function isPrototype(value) {
    var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
    return value === proto;
  }
  function nativeKeysIn(object) {
    var result = [];
    if (object != null) {
      for (var key in Object(object)) {
        result.push(key);
      }
    }
    return result;
  }
  function eq(value, other) {
    return value === other || value !== value && other !== other;
  }
  function isArguments(value) {
    return isArrayLikeObject(value) && hasOwnProperty.call(value, "callee") && (!propertyIsEnumerable.call(value, "callee") || objectToString.call(value) == argsTag);
  }
  var isArray = Array.isArray;
  function isArrayLike(value) {
    return value != null && isLength(value.length) && !isFunction(value);
  }
  function isArrayLikeObject(value) {
    return isObjectLike(value) && isArrayLike(value);
  }
  function isFunction(value) {
    var tag = isObject(value) ? objectToString.call(value) : "";
    return tag == funcTag || tag == genTag;
  }
  function isLength(value) {
    return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
  }
  function isObject(value) {
    var type = typeof value;
    return !!value && (type == "object" || type == "function");
  }
  function isObjectLike(value) {
    return !!value && typeof value == "object";
  }
  var assignInWith = createAssigner(function(object, source, srcIndex, customizer) {
    copyObject(source, keysIn(source), object, customizer);
  });
  var defaults = baseRest(function(args) {
    args.push(undefined, assignInDefaults);
    return apply(assignInWith, undefined, args);
  });
  function keysIn(object) {
    return isArrayLike(object) ? arrayLikeKeys(object, true) : baseKeysIn(object);
  }
  module.exports = defaults;
});

// node_modules/.bun/lodash.isarguments@3.1.0/node_modules/lodash.isarguments/index.js
var require_lodash2 = __commonJS((exports, module) => {
  var MAX_SAFE_INTEGER = 9007199254740991;
  var argsTag = "[object Arguments]";
  var funcTag = "[object Function]";
  var genTag = "[object GeneratorFunction]";
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var objectToString = objectProto.toString;
  var propertyIsEnumerable = objectProto.propertyIsEnumerable;
  function isArguments(value) {
    return isArrayLikeObject(value) && hasOwnProperty.call(value, "callee") && (!propertyIsEnumerable.call(value, "callee") || objectToString.call(value) == argsTag);
  }
  function isArrayLike(value) {
    return value != null && isLength(value.length) && !isFunction(value);
  }
  function isArrayLikeObject(value) {
    return isObjectLike(value) && isArrayLike(value);
  }
  function isFunction(value) {
    var tag = isObject(value) ? objectToString.call(value) : "";
    return tag == funcTag || tag == genTag;
  }
  function isLength(value) {
    return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
  }
  function isObject(value) {
    var type = typeof value;
    return !!value && (type == "object" || type == "function");
  }
  function isObjectLike(value) {
    return !!value && typeof value == "object";
  }
  module.exports = isArguments;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/utils/lodash.js
var require_lodash3 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.isArguments = exports.defaults = exports.noop = undefined;
  var defaults = require_lodash();
  exports.defaults = defaults;
  var isArguments = require_lodash2();
  exports.isArguments = isArguments;
  function noop() {}
  exports.noop = noop;
});

// node_modules/.bun/ms@2.1.3/node_modules/ms/index.js
var require_ms = __commonJS((exports, module) => {
  var s = 1000;
  var m = s * 60;
  var h = m * 60;
  var d = h * 24;
  var w = d * 7;
  var y = d * 365.25;
  module.exports = function(val, options) {
    options = options || {};
    var type = typeof val;
    if (type === "string" && val.length > 0) {
      return parse(val);
    } else if (type === "number" && isFinite(val)) {
      return options.long ? fmtLong(val) : fmtShort(val);
    }
    throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(val));
  };
  function parse(str) {
    str = String(str);
    if (str.length > 100) {
      return;
    }
    var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(str);
    if (!match) {
      return;
    }
    var n = parseFloat(match[1]);
    var type = (match[2] || "ms").toLowerCase();
    switch (type) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return n * y;
      case "weeks":
      case "week":
      case "w":
        return n * w;
      case "days":
      case "day":
      case "d":
        return n * d;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return n * h;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return n * m;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return n * s;
      case "milliseconds":
      case "millisecond":
      case "msecs":
      case "msec":
      case "ms":
        return n;
      default:
        return;
    }
  }
  function fmtShort(ms) {
    var msAbs = Math.abs(ms);
    if (msAbs >= d) {
      return Math.round(ms / d) + "d";
    }
    if (msAbs >= h) {
      return Math.round(ms / h) + "h";
    }
    if (msAbs >= m) {
      return Math.round(ms / m) + "m";
    }
    if (msAbs >= s) {
      return Math.round(ms / s) + "s";
    }
    return ms + "ms";
  }
  function fmtLong(ms) {
    var msAbs = Math.abs(ms);
    if (msAbs >= d) {
      return plural(ms, msAbs, d, "day");
    }
    if (msAbs >= h) {
      return plural(ms, msAbs, h, "hour");
    }
    if (msAbs >= m) {
      return plural(ms, msAbs, m, "minute");
    }
    if (msAbs >= s) {
      return plural(ms, msAbs, s, "second");
    }
    return ms + " ms";
  }
  function plural(ms, msAbs, n, name) {
    var isPlural = msAbs >= n * 1.5;
    return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
  }
});

// node_modules/.bun/debug@4.4.3/node_modules/debug/src/common.js
var require_common = __commonJS((exports, module) => {
  function setup(env) {
    createDebug.debug = createDebug;
    createDebug.default = createDebug;
    createDebug.coerce = coerce;
    createDebug.disable = disable;
    createDebug.enable = enable;
    createDebug.enabled = enabled;
    createDebug.humanize = require_ms();
    createDebug.destroy = destroy;
    Object.keys(env).forEach((key) => {
      createDebug[key] = env[key];
    });
    createDebug.names = [];
    createDebug.skips = [];
    createDebug.formatters = {};
    function selectColor(namespace) {
      let hash = 0;
      for (let i = 0;i < namespace.length; i++) {
        hash = (hash << 5) - hash + namespace.charCodeAt(i);
        hash |= 0;
      }
      return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
    }
    createDebug.selectColor = selectColor;
    function createDebug(namespace) {
      let prevTime;
      let enableOverride = null;
      let namespacesCache;
      let enabledCache;
      function debug(...args) {
        if (!debug.enabled) {
          return;
        }
        const self = debug;
        const curr = Number(new Date);
        const ms = curr - (prevTime || curr);
        self.diff = ms;
        self.prev = prevTime;
        self.curr = curr;
        prevTime = curr;
        args[0] = createDebug.coerce(args[0]);
        if (typeof args[0] !== "string") {
          args.unshift("%O");
        }
        let index = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
          if (match === "%%") {
            return "%";
          }
          index++;
          const formatter = createDebug.formatters[format];
          if (typeof formatter === "function") {
            const val = args[index];
            match = formatter.call(self, val);
            args.splice(index, 1);
            index--;
          }
          return match;
        });
        createDebug.formatArgs.call(self, args);
        const logFn = self.log || createDebug.log;
        logFn.apply(self, args);
      }
      debug.namespace = namespace;
      debug.useColors = createDebug.useColors();
      debug.color = createDebug.selectColor(namespace);
      debug.extend = extend;
      debug.destroy = createDebug.destroy;
      Object.defineProperty(debug, "enabled", {
        enumerable: true,
        configurable: false,
        get: () => {
          if (enableOverride !== null) {
            return enableOverride;
          }
          if (namespacesCache !== createDebug.namespaces) {
            namespacesCache = createDebug.namespaces;
            enabledCache = createDebug.enabled(namespace);
          }
          return enabledCache;
        },
        set: (v) => {
          enableOverride = v;
        }
      });
      if (typeof createDebug.init === "function") {
        createDebug.init(debug);
      }
      return debug;
    }
    function extend(namespace, delimiter) {
      const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
      newDebug.log = this.log;
      return newDebug;
    }
    function enable(namespaces) {
      createDebug.save(namespaces);
      createDebug.namespaces = namespaces;
      createDebug.names = [];
      createDebug.skips = [];
      const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const ns of split) {
        if (ns[0] === "-") {
          createDebug.skips.push(ns.slice(1));
        } else {
          createDebug.names.push(ns);
        }
      }
    }
    function matchesTemplate(search, template) {
      let searchIndex = 0;
      let templateIndex = 0;
      let starIndex = -1;
      let matchIndex = 0;
      while (searchIndex < search.length) {
        if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
          if (template[templateIndex] === "*") {
            starIndex = templateIndex;
            matchIndex = searchIndex;
            templateIndex++;
          } else {
            searchIndex++;
            templateIndex++;
          }
        } else if (starIndex !== -1) {
          templateIndex = starIndex + 1;
          matchIndex++;
          searchIndex = matchIndex;
        } else {
          return false;
        }
      }
      while (templateIndex < template.length && template[templateIndex] === "*") {
        templateIndex++;
      }
      return templateIndex === template.length;
    }
    function disable() {
      const namespaces = [
        ...createDebug.names,
        ...createDebug.skips.map((namespace) => "-" + namespace)
      ].join(",");
      createDebug.enable("");
      return namespaces;
    }
    function enabled(name) {
      for (const skip of createDebug.skips) {
        if (matchesTemplate(name, skip)) {
          return false;
        }
      }
      for (const ns of createDebug.names) {
        if (matchesTemplate(name, ns)) {
          return true;
        }
      }
      return false;
    }
    function coerce(val) {
      if (val instanceof Error) {
        return val.stack || val.message;
      }
      return val;
    }
    function destroy() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    createDebug.enable(createDebug.load());
    return createDebug;
  }
  module.exports = setup;
});

// node_modules/.bun/debug@4.4.3/node_modules/debug/src/browser.js
var require_browser = __commonJS((exports, module) => {
  exports.formatArgs = formatArgs;
  exports.save = save;
  exports.load = load;
  exports.useColors = useColors;
  exports.storage = localstorage();
  exports.destroy = (() => {
    let warned = false;
    return () => {
      if (!warned) {
        warned = true;
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
    };
  })();
  exports.colors = [
    "#0000CC",
    "#0000FF",
    "#0033CC",
    "#0033FF",
    "#0066CC",
    "#0066FF",
    "#0099CC",
    "#0099FF",
    "#00CC00",
    "#00CC33",
    "#00CC66",
    "#00CC99",
    "#00CCCC",
    "#00CCFF",
    "#3300CC",
    "#3300FF",
    "#3333CC",
    "#3333FF",
    "#3366CC",
    "#3366FF",
    "#3399CC",
    "#3399FF",
    "#33CC00",
    "#33CC33",
    "#33CC66",
    "#33CC99",
    "#33CCCC",
    "#33CCFF",
    "#6600CC",
    "#6600FF",
    "#6633CC",
    "#6633FF",
    "#66CC00",
    "#66CC33",
    "#9900CC",
    "#9900FF",
    "#9933CC",
    "#9933FF",
    "#99CC00",
    "#99CC33",
    "#CC0000",
    "#CC0033",
    "#CC0066",
    "#CC0099",
    "#CC00CC",
    "#CC00FF",
    "#CC3300",
    "#CC3333",
    "#CC3366",
    "#CC3399",
    "#CC33CC",
    "#CC33FF",
    "#CC6600",
    "#CC6633",
    "#CC9900",
    "#CC9933",
    "#CCCC00",
    "#CCCC33",
    "#FF0000",
    "#FF0033",
    "#FF0066",
    "#FF0099",
    "#FF00CC",
    "#FF00FF",
    "#FF3300",
    "#FF3333",
    "#FF3366",
    "#FF3399",
    "#FF33CC",
    "#FF33FF",
    "#FF6600",
    "#FF6633",
    "#FF9900",
    "#FF9933",
    "#FFCC00",
    "#FFCC33"
  ];
  function useColors() {
    if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
      return true;
    }
    if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
      return false;
    }
    let m;
    return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
  }
  function formatArgs(args) {
    args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
    if (!this.useColors) {
      return;
    }
    const c = "color: " + this.color;
    args.splice(1, 0, c, "color: inherit");
    let index = 0;
    let lastC = 0;
    args[0].replace(/%[a-zA-Z%]/g, (match) => {
      if (match === "%%") {
        return;
      }
      index++;
      if (match === "%c") {
        lastC = index;
      }
    });
    args.splice(lastC, 0, c);
  }
  exports.log = console.debug || console.log || (() => {});
  function save(namespaces) {
    try {
      if (namespaces) {
        exports.storage.setItem("debug", namespaces);
      } else {
        exports.storage.removeItem("debug");
      }
    } catch (error) {}
  }
  function load() {
    let r;
    try {
      r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
    } catch (error) {}
    if (!r && typeof process !== "undefined" && "env" in process) {
      r = process.env.DEBUG;
    }
    return r;
  }
  function localstorage() {
    try {
      return localStorage;
    } catch (error) {}
  }
  module.exports = require_common()(exports);
  var { formatters } = module.exports;
  formatters.j = function(v) {
    try {
      return JSON.stringify(v);
    } catch (error) {
      return "[UnexpectedJSONParseError]: " + error.message;
    }
  };
});

// node_modules/.bun/debug@4.4.3/node_modules/debug/src/node.js
var require_node = __commonJS((exports, module) => {
  var tty = __require("tty");
  var util = __require("util");
  exports.init = init;
  exports.log = log;
  exports.formatArgs = formatArgs;
  exports.save = save;
  exports.load = load;
  exports.useColors = useColors;
  exports.destroy = util.deprecate(() => {}, "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
  exports.colors = [6, 2, 3, 4, 5, 1];
  try {
    const supportsColor = (()=>{throw new Error("Cannot require module "+"supports-color");})();
    if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
      exports.colors = [
        20,
        21,
        26,
        27,
        32,
        33,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        56,
        57,
        62,
        63,
        68,
        69,
        74,
        75,
        76,
        77,
        78,
        79,
        80,
        81,
        92,
        93,
        98,
        99,
        112,
        113,
        128,
        129,
        134,
        135,
        148,
        149,
        160,
        161,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        171,
        172,
        173,
        178,
        179,
        184,
        185,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        203,
        204,
        205,
        206,
        207,
        208,
        209,
        214,
        215,
        220,
        221
      ];
    }
  } catch (error) {}
  exports.inspectOpts = Object.keys(process.env).filter((key) => {
    return /^debug_/i.test(key);
  }).reduce((obj, key) => {
    const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
      return k.toUpperCase();
    });
    let val = process.env[key];
    if (/^(yes|on|true|enabled)$/i.test(val)) {
      val = true;
    } else if (/^(no|off|false|disabled)$/i.test(val)) {
      val = false;
    } else if (val === "null") {
      val = null;
    } else {
      val = Number(val);
    }
    obj[prop] = val;
    return obj;
  }, {});
  function useColors() {
    return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(process.stderr.fd);
  }
  function formatArgs(args) {
    const { namespace: name, useColors: useColors2 } = this;
    if (useColors2) {
      const c = this.color;
      const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
      const prefix = `  ${colorCode};1m${name} \x1B[0m`;
      args[0] = prefix + args[0].split(`
`).join(`
` + prefix);
      args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
    } else {
      args[0] = getDate() + name + " " + args[0];
    }
  }
  function getDate() {
    if (exports.inspectOpts.hideDate) {
      return "";
    }
    return new Date().toISOString() + " ";
  }
  function log(...args) {
    return process.stderr.write(util.formatWithOptions(exports.inspectOpts, ...args) + `
`);
  }
  function save(namespaces) {
    if (namespaces) {
      process.env.DEBUG = namespaces;
    } else {
      delete process.env.DEBUG;
    }
  }
  function load() {
    return process.env.DEBUG;
  }
  function init(debug) {
    debug.inspectOpts = {};
    const keys = Object.keys(exports.inspectOpts);
    for (let i = 0;i < keys.length; i++) {
      debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
    }
  }
  module.exports = require_common()(exports);
  var { formatters } = module.exports;
  formatters.o = function(v) {
    this.inspectOpts.colors = this.useColors;
    return util.inspect(v, this.inspectOpts).split(`
`).map((str) => str.trim()).join(" ");
  };
  formatters.O = function(v) {
    this.inspectOpts.colors = this.useColors;
    return util.inspect(v, this.inspectOpts);
  };
});

// node_modules/.bun/debug@4.4.3/node_modules/debug/src/index.js
var require_src = __commonJS((exports, module) => {
  if (typeof process === "undefined" || process.type === "renderer" || false || process.__nwjs) {
    module.exports = require_browser();
  } else {
    module.exports = require_node();
  }
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/utils/debug.js
var require_debug = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.genRedactedString = exports.getStringValue = exports.MAX_ARGUMENT_LENGTH = undefined;
  var debug_1 = require_src();
  var MAX_ARGUMENT_LENGTH = 200;
  exports.MAX_ARGUMENT_LENGTH = MAX_ARGUMENT_LENGTH;
  var NAMESPACE_PREFIX = "ioredis";
  function getStringValue(v) {
    if (v === null) {
      return;
    }
    switch (typeof v) {
      case "boolean":
        return;
      case "number":
        return;
      case "object":
        if (Buffer.isBuffer(v)) {
          return v.toString("hex");
        }
        if (Array.isArray(v)) {
          return v.join(",");
        }
        try {
          return JSON.stringify(v);
        } catch (e) {
          return;
        }
      case "string":
        return v;
    }
  }
  exports.getStringValue = getStringValue;
  function genRedactedString(str, maxLen) {
    const { length } = str;
    return length <= maxLen ? str : str.slice(0, maxLen) + ' ... <REDACTED full-length="' + length + '">';
  }
  exports.genRedactedString = genRedactedString;
  function genDebugFunction(namespace) {
    const fn = (0, debug_1.default)(`${NAMESPACE_PREFIX}:${namespace}`);
    function wrappedDebug(...args) {
      if (!fn.enabled) {
        return;
      }
      for (let i = 1;i < args.length; i++) {
        const str = getStringValue(args[i]);
        if (typeof str === "string" && str.length > MAX_ARGUMENT_LENGTH) {
          args[i] = genRedactedString(str, MAX_ARGUMENT_LENGTH);
        }
      }
      return fn.apply(null, args);
    }
    Object.defineProperties(wrappedDebug, {
      namespace: {
        get() {
          return fn.namespace;
        }
      },
      enabled: {
        get() {
          return fn.enabled;
        }
      },
      destroy: {
        get() {
          return fn.destroy;
        }
      },
      log: {
        get() {
          return fn.log;
        },
        set(l) {
          fn.log = l;
        }
      }
    });
    return wrappedDebug;
  }
  exports.default = genDebugFunction;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/constants/TLSProfiles.js
var require_TLSProfiles = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var RedisCloudCA = `-----BEGIN CERTIFICATE-----
MIIDTzCCAjegAwIBAgIJAKSVpiDswLcwMA0GCSqGSIb3DQEBBQUAMD4xFjAUBgNV
BAoMDUdhcmFudGlhIERhdGExJDAiBgNVBAMMG1NTTCBDZXJ0aWZpY2F0aW9uIEF1
dGhvcml0eTAeFw0xMzEwMDExMjE0NTVaFw0yMzA5MjkxMjE0NTVaMD4xFjAUBgNV
BAoMDUdhcmFudGlhIERhdGExJDAiBgNVBAMMG1NTTCBDZXJ0aWZpY2F0aW9uIEF1
dGhvcml0eTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALZqkh/DczWP
JnxnHLQ7QL0T4B4CDKWBKCcisriGbA6ZePWVNo4hfKQC6JrzfR+081NeD6VcWUiz
rmd+jtPhIY4c+WVQYm5PKaN6DT1imYdxQw7aqO5j2KUCEh/cznpLxeSHoTxlR34E
QwF28Wl3eg2vc5ct8LjU3eozWVk3gb7alx9mSA2SgmuX5lEQawl++rSjsBStemY2
BDwOpAMXIrdEyP/cVn8mkvi/BDs5M5G+09j0gfhyCzRWMQ7Hn71u1eolRxwVxgi3
TMn+/vTaFSqxKjgck6zuAYjBRPaHe7qLxHNr1So/Mc9nPy+3wHebFwbIcnUojwbp
4nctkWbjb2cCAwEAAaNQME4wHQYDVR0OBBYEFP1whtcrydmW3ZJeuSoKZIKjze3w
MB8GA1UdIwQYMBaAFP1whtcrydmW3ZJeuSoKZIKjze3wMAwGA1UdEwQFMAMBAf8w
DQYJKoZIhvcNAQEFBQADggEBAG2erXhwRAa7+ZOBs0B6X57Hwyd1R4kfmXcs0rta
lbPpvgULSiB+TCbf3EbhJnHGyvdCY1tvlffLjdA7HJ0PCOn+YYLBA0pTU/dyvrN6
Su8NuS5yubnt9mb13nDGYo1rnt0YRfxN+8DM3fXIVr038A30UlPX2Ou1ExFJT0MZ
uFKY6ZvLdI6/1cbgmguMlAhM+DhKyV6Sr5699LM3zqeI816pZmlREETYkGr91q7k
BpXJu/dtHaGxg1ZGu6w/PCsYGUcECWENYD4VQPd8N32JjOfu6vEgoEAwfPP+3oGp
Z4m3ewACcWOAenqflb+cQYC4PsF7qbXDmRaWrbKntOlZ3n0=
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIGMTCCBBmgAwIBAgICEAAwDQYJKoZIhvcNAQELBQAwajELMAkGA1UEBhMCVVMx
CzAJBgNVBAgMAkNBMQswCQYDVQQHDAJDQTESMBAGA1UECgwJUmVkaXNMYWJzMS0w
KwYDVQQDDCRSZWRpc0xhYnMgUm9vdCBDZXJ0aWZpY2F0ZSBBdXRob3JpdHkwHhcN
MTgwMjI1MTUzNzM3WhcNMjgwMjIzMTUzNzM3WjBfMQswCQYDVQQGEwJVUzELMAkG
A1UECAwCQ0ExEjAQBgNVBAoMCVJlZGlzTGFiczEvMC0GA1UEAwwmUkNQIEludGVy
bWVkaWF0ZSBDZXJ0aWZpY2F0ZSBBdXRob3JpdHkwggIiMA0GCSqGSIb3DQEBAQUA
A4ICDwAwggIKAoICAQDf9dqbxc8Bq7Ctq9rWcxrGNKKHivqLAFpPq02yLPx6fsOv
Tq7GsDChAYBBc4v7Y2Ap9RD5Vs3dIhEANcnolf27QwrG9RMnnvzk8pCvp1o6zSU4
VuOE1W66/O1/7e2rVxyrnTcP7UgK43zNIXu7+tiAqWsO92uSnuMoGPGpeaUm1jym
hjWKtkAwDFSqvHY+XL5qDVBEjeUe+WHkYUg40cAXjusAqgm2hZt29c2wnVrxW25W
P0meNlzHGFdA2AC5z54iRiqj57dTfBTkHoBczQxcyw6hhzxZQ4e5I5zOKjXXEhZN
r0tA3YC14CTabKRus/JmZieyZzRgEy2oti64tmLYTqSlAD78pRL40VNoaSYetXLw
hhNsXCHgWaY6d5bLOc/aIQMAV5oLvZQKvuXAF1IDmhPA+bZbpWipp0zagf1P1H3s
UzsMdn2KM0ejzgotbtNlj5TcrVwpmvE3ktvUAuA+hi3FkVx1US+2Gsp5x4YOzJ7u
P1WPk6ShF0JgnJH2ILdj6kttTWwFzH17keSFICWDfH/+kM+k7Y1v3EXMQXE7y0T9
MjvJskz6d/nv+sQhY04xt64xFMGTnZjlJMzfQNi7zWFLTZnDD0lPowq7l3YiPoTT
t5Xky83lu0KZsZBo0WlWaDG00gLVdtRgVbcuSWxpi5BdLb1kRab66JptWjxwXQID
AQABo4HrMIHoMDoGA1UdHwQzMDEwL6AtoCuGKWh0dHBzOi8vcmwtY2Etc2VydmVy
LnJlZGlzbGFicy5jb20vdjEvY3JsMEYGCCsGAQUFBwEBBDowODA2BggrBgEFBQcw
AYYqaHR0cHM6Ly9ybC1jYS1zZXJ2ZXIucmVkaXNsYWJzLmNvbS92MS9vY3NwMB0G
A1UdDgQWBBQHar5OKvQUpP2qWt6mckzToeCOHDAfBgNVHSMEGDAWgBQi42wH6hM4
L2sujEvLM0/u8lRXTzASBgNVHRMBAf8ECDAGAQH/AgEAMA4GA1UdDwEB/wQEAwIB
hjANBgkqhkiG9w0BAQsFAAOCAgEAirEn/iTsAKyhd+pu2W3Z5NjCko4NPU0EYUbr
AP7+POK2rzjIrJO3nFYQ/LLuC7KCXG+2qwan2SAOGmqWst13Y+WHp44Kae0kaChW
vcYLXXSoGQGC8QuFSNUdaeg3RbMDYFT04dOkqufeWVccoHVxyTSg9eD8LZuHn5jw
7QDLiEECBmIJHk5Eeo2TAZrx4Yx6ufSUX5HeVjlAzqwtAqdt99uCJ/EL8bgpWbe+
XoSpvUv0SEC1I1dCAhCKAvRlIOA6VBcmzg5Am12KzkqTul12/VEFIgzqu0Zy2Jbc
AUPrYVu/+tOGXQaijy7YgwH8P8n3s7ZeUa1VABJHcxrxYduDDJBLZi+MjheUDaZ1
jQRHYevI2tlqeSBqdPKG4zBY5lS0GiAlmuze5oENt0P3XboHoZPHiqcK3VECgTVh
/BkJcuudETSJcZDmQ8YfoKfBzRQNg2sv/hwvUv73Ss51Sco8GEt2lD8uEdib1Q6z
zDT5lXJowSzOD5ZA9OGDjnSRL+2riNtKWKEqvtEG3VBJoBzu9GoxbAc7wIZLxmli
iF5a/Zf5X+UXD3s4TMmy6C4QZJpAA2egsSQCnraWO2ULhh7iXMysSkF/nzVfZn43
iqpaB8++9a37hWq14ZmOv0TJIDz//b2+KC4VFXWQ5W5QC6whsjT+OlG4p5ZYG0jo
616pxqo=
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIFujCCA6KgAwIBAgIJAJ1aTT1lu2ScMA0GCSqGSIb3DQEBCwUAMGoxCzAJBgNV
BAYTAlVTMQswCQYDVQQIDAJDQTELMAkGA1UEBwwCQ0ExEjAQBgNVBAoMCVJlZGlz
TGFiczEtMCsGA1UEAwwkUmVkaXNMYWJzIFJvb3QgQ2VydGlmaWNhdGUgQXV0aG9y
aXR5MB4XDTE4MDIyNTE1MjA0MloXDTM4MDIyMDE1MjA0MlowajELMAkGA1UEBhMC
VVMxCzAJBgNVBAgMAkNBMQswCQYDVQQHDAJDQTESMBAGA1UECgwJUmVkaXNMYWJz
MS0wKwYDVQQDDCRSZWRpc0xhYnMgUm9vdCBDZXJ0aWZpY2F0ZSBBdXRob3JpdHkw
ggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIKAoICAQDLEjXy7YrbN5Waau5cd6g1
G5C2tMmeTpZ0duFAPxNU4oE3RHS5gGiok346fUXuUxbZ6QkuzeN2/2Z+RmRcJhQY
Dm0ZgdG4x59An1TJfnzKKoWj8ISmoHS/TGNBdFzXV7FYNLBuqZouqePI6ReC6Qhl
pp45huV32Q3a6IDrrvx7Wo5ZczEQeFNbCeCOQYNDdTmCyEkHqc2AGo8eoIlSTutT
ULOC7R5gzJVTS0e1hesQ7jmqHjbO+VQS1NAL4/5K6cuTEqUl+XhVhPdLWBXJQ5ag
54qhX4v+ojLzeU1R/Vc6NjMvVtptWY6JihpgplprN0Yh2556ewcXMeturcKgXfGJ
xeYzsjzXerEjrVocX5V8BNrg64NlifzTMKNOOv4fVZszq1SIHR8F9ROrqiOdh8iC
JpUbLpXH9hWCSEO6VRMB2xJoKu3cgl63kF30s77x7wLFMEHiwsQRKxooE1UhgS9K
2sO4TlQ1eWUvFvHSTVDQDlGQ6zu4qjbOpb3Q8bQwoK+ai2alkXVR4Ltxe9QlgYK3
StsnPhruzZGA0wbXdpw0bnM+YdlEm5ffSTpNIfgHeaa7Dtb801FtA71ZlH7A6TaI
SIQuUST9EKmv7xrJyx0W1pGoPOLw5T029aTjnICSLdtV9bLwysrLhIYG5bnPq78B
cS+jZHFGzD7PUVGQD01nOQIDAQABo2MwYTAdBgNVHQ4EFgQUIuNsB+oTOC9rLoxL
yzNP7vJUV08wHwYDVR0jBBgwFoAUIuNsB+oTOC9rLoxLyzNP7vJUV08wDwYDVR0T
AQH/BAUwAwEB/zAOBgNVHQ8BAf8EBAMCAYYwDQYJKoZIhvcNAQELBQADggIBAHfg
z5pMNUAKdMzK1aS1EDdK9yKz4qicILz5czSLj1mC7HKDRy8cVADUxEICis++CsCu
rYOvyCVergHQLREcxPq4rc5Nq1uj6J6649NEeh4WazOOjL4ZfQ1jVznMbGy+fJm3
3Hoelv6jWRG9iqeJZja7/1s6YC6bWymI/OY1e4wUKeNHAo+Vger7MlHV+RuabaX+
hSJ8bJAM59NCM7AgMTQpJCncrcdLeceYniGy5Q/qt2b5mJkQVkIdy4TPGGB+AXDJ
D0q3I/JDRkDUFNFdeW0js7fHdsvCR7O3tJy5zIgEV/o/BCkmJVtuwPYOrw/yOlKj
TY/U7ATAx9VFF6/vYEOMYSmrZlFX+98L6nJtwDqfLB5VTltqZ4H/KBxGE3IRSt9l
FXy40U+LnXzhhW+7VBAvyYX8GEXhHkKU8Gqk1xitrqfBXY74xKgyUSTolFSfFVgj
mcM/X4K45bka+qpkj7Kfv/8D4j6aZekwhN2ly6hhC1SmQ8qjMjpG/mrWOSSHZFmf
ybu9iD2AYHeIOkshIl6xYIa++Q/00/vs46IzAbQyriOi0XxlSMMVtPx0Q3isp+ji
n8Mq9eOuxYOEQ4of8twUkUDd528iwGtEdwf0Q01UyT84S62N8AySl1ZBKXJz6W4F
UhWfa/HQYOAPDdEjNgnVwLI23b8t0TozyCWw7q8h
-----END CERTIFICATE-----

-----BEGIN CERTIFICATE-----
MIIEjzCCA3egAwIBAgIQe55B/ALCKJDZtdNT8kD6hTANBgkqhkiG9w0BAQsFADBM
MSAwHgYDVQQLExdHbG9iYWxTaWduIFJvb3QgQ0EgLSBSMzETMBEGA1UEChMKR2xv
YmFsU2lnbjETMBEGA1UEAxMKR2xvYmFsU2lnbjAeFw0yMjAxMjYxMjAwMDBaFw0y
NTAxMjYwMDAwMDBaMFgxCzAJBgNVBAYTAkJFMRkwFwYDVQQKExBHbG9iYWxTaWdu
IG52LXNhMS4wLAYDVQQDEyVHbG9iYWxTaWduIEF0bGFzIFIzIE9WIFRMUyBDQSAy
MDIyIFEyMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmGmg1LW9b7Lf
8zDD83yBDTEkt+FOxKJZqF4veWc5KZsQj9HfnUS2e5nj/E+JImlGPsQuoiosLuXD
BVBNAMcUFa11buFMGMeEMwiTmCXoXRrXQmH0qjpOfKgYc5gHG3BsRGaRrf7VR4eg
ofNMG9wUBw4/g/TT7+bQJdA4NfE7Y4d5gEryZiBGB/swaX6Jp/8MF4TgUmOWmalK
dZCKyb4sPGQFRTtElk67F7vU+wdGcrcOx1tDcIB0ncjLPMnaFicagl+daWGsKqTh
counQb6QJtYHa91KvCfKWocMxQ7OIbB5UARLPmC4CJ1/f8YFm35ebfzAeULYdGXu
jE9CLor0OwIDAQABo4IBXzCCAVswDgYDVR0PAQH/BAQDAgGGMB0GA1UdJQQWMBQG
CCsGAQUFBwMBBggrBgEFBQcDAjASBgNVHRMBAf8ECDAGAQH/AgEAMB0GA1UdDgQW
BBSH5Zq7a7B/t95GfJWkDBpA8HHqdjAfBgNVHSMEGDAWgBSP8Et/qC5FJK5NUPpj
move4t0bvDB7BggrBgEFBQcBAQRvMG0wLgYIKwYBBQUHMAGGImh0dHA6Ly9vY3Nw
Mi5nbG9iYWxzaWduLmNvbS9yb290cjMwOwYIKwYBBQUHMAKGL2h0dHA6Ly9zZWN1
cmUuZ2xvYmFsc2lnbi5jb20vY2FjZXJ0L3Jvb3QtcjMuY3J0MDYGA1UdHwQvMC0w
K6ApoCeGJWh0dHA6Ly9jcmwuZ2xvYmFsc2lnbi5jb20vcm9vdC1yMy5jcmwwIQYD
VR0gBBowGDAIBgZngQwBAgIwDAYKKwYBBAGgMgoBAjANBgkqhkiG9w0BAQsFAAOC
AQEAKRic9/f+nmhQU/wz04APZLjgG5OgsuUOyUEZjKVhNGDwxGTvKhyXGGAMW2B/
3bRi+aElpXwoxu3pL6fkElbX3B0BeS5LoDtxkyiVEBMZ8m+sXbocwlPyxrPbX6mY
0rVIvnuUeBH8X0L5IwfpNVvKnBIilTbcebfHyXkPezGwz7E1yhUULjJFm2bt0SdX
y+4X/WeiiYIv+fTVgZZgl+/2MKIsu/qdBJc3f3TvJ8nz+Eax1zgZmww+RSQWeOj3
15Iw6Z5FX+NwzY/Ab+9PosR5UosSeq+9HhtaxZttXG1nVh+avYPGYddWmiMT90J5
ZgKnO/Fx2hBgTxhOTMYaD312kg==
-----END CERTIFICATE-----

-----BEGIN CERTIFICATE-----
MIIDXzCCAkegAwIBAgILBAAAAAABIVhTCKIwDQYJKoZIhvcNAQELBQAwTDEgMB4G
A1UECxMXR2xvYmFsU2lnbiBSb290IENBIC0gUjMxEzARBgNVBAoTCkdsb2JhbFNp
Z24xEzARBgNVBAMTCkdsb2JhbFNpZ24wHhcNMDkwMzE4MTAwMDAwWhcNMjkwMzE4
MTAwMDAwWjBMMSAwHgYDVQQLExdHbG9iYWxTaWduIFJvb3QgQ0EgLSBSMzETMBEG
A1UEChMKR2xvYmFsU2lnbjETMBEGA1UEAxMKR2xvYmFsU2lnbjCCASIwDQYJKoZI
hvcNAQEBBQADggEPADCCAQoCggEBAMwldpB5BngiFvXAg7aEyiie/QV2EcWtiHL8
RgJDx7KKnQRfJMsuS+FggkbhUqsMgUdwbN1k0ev1LKMPgj0MK66X17YUhhB5uzsT
gHeMCOFJ0mpiLx9e+pZo34knlTifBtc+ycsmWQ1z3rDI6SYOgxXG71uL0gRgykmm
KPZpO/bLyCiR5Z2KYVc3rHQU3HTgOu5yLy6c+9C7v/U9AOEGM+iCK65TpjoWc4zd
QQ4gOsC0p6Hpsk+QLjJg6VfLuQSSaGjlOCZgdbKfd/+RFO+uIEn8rUAVSNECMWEZ
XriX7613t2Saer9fwRPvm2L7DWzgVGkWqQPabumDk3F2xmmFghcCAwEAAaNCMEAw
DgYDVR0PAQH/BAQDAgEGMA8GA1UdEwEB/wQFMAMBAf8wHQYDVR0OBBYEFI/wS3+o
LkUkrk1Q+mOai97i3Ru8MA0GCSqGSIb3DQEBCwUAA4IBAQBLQNvAUKr+yAzv95ZU
RUm7lgAJQayzE4aGKAczymvmdLm6AC2upArT9fHxD4q/c2dKg8dEe3jgr25sbwMp
jjM5RcOO5LlXbKr8EpbsU8Yt5CRsuZRj+9xTaGdWPoO4zzUhw8lo/s7awlOqzJCK
6fBdRoyV3XpYKBovHd7NADdBj+1EbddTKJd+82cEHhXXipa0095MJ6RMG3NzdvQX
mcIfeg7jLQitChws/zyrVQ4PkX4268NXSb7hLi18YIvDQVETI53O9zJrlAGomecs
Mx86OyXShkDOOyyGeMlhLxS67ttVb9+E7gUJTb0o2HLO02JQZR7rkpeDMdmztcpH
WD9f
-----END CERTIFICATE-----`;
  var TLSProfiles = {
    RedisCloudFixed: { ca: RedisCloudCA },
    RedisCloudFlexible: { ca: RedisCloudCA }
  };
  exports.default = TLSProfiles;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/utils/index.js
var require_utils2 = __commonJS((exports) => {
  var __dirname = "/home/kncos/Documents/cracked-judge/node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/utils";
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.noop = exports.defaults = exports.Debug = exports.getPackageMeta = exports.zipMap = exports.CONNECTION_CLOSED_ERROR_MSG = exports.shuffle = exports.sample = exports.resolveTLSProfile = exports.parseURL = exports.optimizeErrorStack = exports.toArg = exports.convertMapToArray = exports.convertObjectToArray = exports.timeout = exports.packObject = exports.isInt = exports.wrapMultiResult = exports.convertBufferToString = undefined;
  var fs_1 = __require("fs");
  var path_1 = __require("path");
  var url_1 = __require("url");
  var lodash_1 = require_lodash3();
  Object.defineProperty(exports, "defaults", { enumerable: true, get: function() {
    return lodash_1.defaults;
  } });
  Object.defineProperty(exports, "noop", { enumerable: true, get: function() {
    return lodash_1.noop;
  } });
  var debug_1 = require_debug();
  exports.Debug = debug_1.default;
  var TLSProfiles_1 = require_TLSProfiles();
  function convertBufferToString(value, encoding) {
    if (value instanceof Buffer) {
      return value.toString(encoding);
    }
    if (Array.isArray(value)) {
      const length = value.length;
      const res = Array(length);
      for (let i = 0;i < length; ++i) {
        res[i] = value[i] instanceof Buffer && encoding === "utf8" ? value[i].toString() : convertBufferToString(value[i], encoding);
      }
      return res;
    }
    return value;
  }
  exports.convertBufferToString = convertBufferToString;
  function wrapMultiResult(arr) {
    if (!arr) {
      return null;
    }
    const result = [];
    const length = arr.length;
    for (let i = 0;i < length; ++i) {
      const item = arr[i];
      if (item instanceof Error) {
        result.push([item]);
      } else {
        result.push([null, item]);
      }
    }
    return result;
  }
  exports.wrapMultiResult = wrapMultiResult;
  function isInt(value) {
    const x = parseFloat(value);
    return !isNaN(value) && (x | 0) === x;
  }
  exports.isInt = isInt;
  function packObject(array) {
    const result = {};
    const length = array.length;
    for (let i = 1;i < length; i += 2) {
      result[array[i - 1]] = array[i];
    }
    return result;
  }
  exports.packObject = packObject;
  function timeout(callback, timeout2) {
    let timer = null;
    const run = function() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
        callback.apply(this, arguments);
      }
    };
    timer = setTimeout(run, timeout2, new Error("timeout"));
    return run;
  }
  exports.timeout = timeout;
  function convertObjectToArray(obj) {
    const result = [];
    const keys = Object.keys(obj);
    for (let i = 0, l = keys.length;i < l; i++) {
      result.push(keys[i], obj[keys[i]]);
    }
    return result;
  }
  exports.convertObjectToArray = convertObjectToArray;
  function convertMapToArray(map) {
    const result = [];
    let pos = 0;
    map.forEach(function(value, key) {
      result[pos] = key;
      result[pos + 1] = value;
      pos += 2;
    });
    return result;
  }
  exports.convertMapToArray = convertMapToArray;
  function toArg(arg) {
    if (arg === null || typeof arg === "undefined") {
      return "";
    }
    return String(arg);
  }
  exports.toArg = toArg;
  function optimizeErrorStack(error, friendlyStack, filterPath) {
    const stacks = friendlyStack.split(`
`);
    let lines = "";
    let i;
    for (i = 1;i < stacks.length; ++i) {
      if (stacks[i].indexOf(filterPath) === -1) {
        break;
      }
    }
    for (let j = i;j < stacks.length; ++j) {
      lines += `
` + stacks[j];
    }
    if (error.stack) {
      const pos = error.stack.indexOf(`
`);
      error.stack = error.stack.slice(0, pos) + lines;
    }
    return error;
  }
  exports.optimizeErrorStack = optimizeErrorStack;
  function parseURL(url) {
    if (isInt(url)) {
      return { port: url };
    }
    let parsed = (0, url_1.parse)(url, true, true);
    if (!parsed.slashes && url[0] !== "/") {
      url = "//" + url;
      parsed = (0, url_1.parse)(url, true, true);
    }
    const options = parsed.query || {};
    const result = {};
    if (parsed.auth) {
      const index = parsed.auth.indexOf(":");
      result.username = index === -1 ? parsed.auth : parsed.auth.slice(0, index);
      result.password = index === -1 ? "" : parsed.auth.slice(index + 1);
    }
    if (parsed.pathname) {
      if (parsed.protocol === "redis:" || parsed.protocol === "rediss:") {
        if (parsed.pathname.length > 1) {
          result.db = parsed.pathname.slice(1);
        }
      } else {
        result.path = parsed.pathname;
      }
    }
    if (parsed.host) {
      result.host = parsed.hostname;
    }
    if (parsed.port) {
      result.port = parsed.port;
    }
    if (typeof options.family === "string") {
      const intFamily = Number.parseInt(options.family, 10);
      if (!Number.isNaN(intFamily)) {
        result.family = intFamily;
      }
    }
    (0, lodash_1.defaults)(result, options);
    return result;
  }
  exports.parseURL = parseURL;
  function resolveTLSProfile(options) {
    let tls = options === null || options === undefined ? undefined : options.tls;
    if (typeof tls === "string")
      tls = { profile: tls };
    const profile = TLSProfiles_1.default[tls === null || tls === undefined ? undefined : tls.profile];
    if (profile) {
      tls = Object.assign({}, profile, tls);
      delete tls.profile;
      options = Object.assign({}, options, { tls });
    }
    return options;
  }
  exports.resolveTLSProfile = resolveTLSProfile;
  function sample(array, from = 0) {
    const length = array.length;
    if (from >= length) {
      return null;
    }
    return array[from + Math.floor(Math.random() * (length - from))];
  }
  exports.sample = sample;
  function shuffle(array) {
    let counter = array.length;
    while (counter > 0) {
      const index = Math.floor(Math.random() * counter);
      counter--;
      [array[counter], array[index]] = [array[index], array[counter]];
    }
    return array;
  }
  exports.shuffle = shuffle;
  exports.CONNECTION_CLOSED_ERROR_MSG = "Connection is closed.";
  function zipMap(keys, values) {
    const map = new Map;
    keys.forEach((key, index) => {
      map.set(key, values[index]);
    });
    return map;
  }
  exports.zipMap = zipMap;
  var cachedPackageMeta = null;
  async function getPackageMeta() {
    if (cachedPackageMeta) {
      return cachedPackageMeta;
    }
    try {
      const filePath = (0, path_1.resolve)(__dirname, "..", "..", "package.json");
      const data = await fs_1.promises.readFile(filePath, "utf8");
      const parsed = JSON.parse(data);
      cachedPackageMeta = {
        version: parsed.version
      };
      return cachedPackageMeta;
    } catch (err) {
      cachedPackageMeta = {
        version: "error-fetching-version"
      };
      return cachedPackageMeta;
    }
  }
  exports.getPackageMeta = getPackageMeta;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/utils/argumentParsers.js
var require_argumentParsers = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.parseBlockOption = exports.parseSecondsArgument = undefined;
  var parseNumberArgument = (arg) => {
    if (typeof arg === "number") {
      return arg;
    }
    if (Buffer.isBuffer(arg)) {
      return parseNumberArgument(arg.toString());
    }
    if (typeof arg === "string") {
      const value = Number(arg);
      return Number.isFinite(value) ? value : undefined;
    }
    return;
  };
  var parseStringArgument = (arg) => {
    if (typeof arg === "string") {
      return arg;
    }
    if (Buffer.isBuffer(arg)) {
      return arg.toString();
    }
    return;
  };
  var parseSecondsArgument = (arg) => {
    const value = parseNumberArgument(arg);
    if (value === undefined) {
      return;
    }
    if (value <= 0) {
      return 0;
    }
    return value * 1000;
  };
  exports.parseSecondsArgument = parseSecondsArgument;
  var parseBlockOption = (args) => {
    for (let i = 0;i < args.length; i++) {
      const token = parseStringArgument(args[i]);
      if (token && token.toLowerCase() === "block") {
        const duration = parseNumberArgument(args[i + 1]);
        if (duration === undefined) {
          return;
        }
        if (duration <= 0) {
          return 0;
        }
        return duration;
      }
    }
    return null;
  };
  exports.parseBlockOption = parseBlockOption;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/Command.js
var require_Command = __commonJS((exports) => {
  var __dirname = "/home/kncos/Documents/cracked-judge/node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built";
  Object.defineProperty(exports, "__esModule", { value: true });
  var commands_1 = require_built();
  var calculateSlot = require_lib();
  var standard_as_callback_1 = require_built2();
  var utils_1 = require_utils2();
  var argumentParsers_1 = require_argumentParsers();

  class Command {
    constructor(name, args = [], options = {}, callback) {
      this.name = name;
      this.inTransaction = false;
      this.isResolved = false;
      this.transformed = false;
      this.replyEncoding = options.replyEncoding;
      this.errorStack = options.errorStack;
      this.args = args.flat();
      this.callback = callback;
      this.initPromise();
      if (options.keyPrefix) {
        const isBufferKeyPrefix = options.keyPrefix instanceof Buffer;
        let keyPrefixBuffer = isBufferKeyPrefix ? options.keyPrefix : null;
        this._iterateKeys((key) => {
          if (key instanceof Buffer) {
            if (keyPrefixBuffer === null) {
              keyPrefixBuffer = Buffer.from(options.keyPrefix);
            }
            return Buffer.concat([keyPrefixBuffer, key]);
          } else if (isBufferKeyPrefix) {
            return Buffer.concat([options.keyPrefix, Buffer.from(String(key))]);
          }
          return options.keyPrefix + key;
        });
      }
      if (options.readOnly) {
        this.isReadOnly = true;
      }
    }
    static checkFlag(flagName, commandName) {
      commandName = commandName.toLowerCase();
      return !!this.getFlagMap()[flagName][commandName];
    }
    static setArgumentTransformer(name, func) {
      this._transformer.argument[name] = func;
    }
    static setReplyTransformer(name, func) {
      this._transformer.reply[name] = func;
    }
    static getFlagMap() {
      if (!this.flagMap) {
        this.flagMap = Object.keys(Command.FLAGS).reduce((map, flagName) => {
          map[flagName] = {};
          Command.FLAGS[flagName].forEach((commandName) => {
            map[flagName][commandName] = true;
          });
          return map;
        }, {});
      }
      return this.flagMap;
    }
    getSlot() {
      if (typeof this.slot === "undefined") {
        const key = this.getKeys()[0];
        this.slot = key == null ? null : calculateSlot(key);
      }
      return this.slot;
    }
    getKeys() {
      return this._iterateKeys();
    }
    toWritable(_socket) {
      let result;
      const commandStr = "*" + (this.args.length + 1) + `\r
$` + Buffer.byteLength(this.name) + `\r
` + this.name + `\r
`;
      if (this.bufferMode) {
        const buffers = new MixedBuffers;
        buffers.push(commandStr);
        for (let i = 0;i < this.args.length; ++i) {
          const arg = this.args[i];
          if (arg instanceof Buffer) {
            if (arg.length === 0) {
              buffers.push(`$0\r
\r
`);
            } else {
              buffers.push("$" + arg.length + `\r
`);
              buffers.push(arg);
              buffers.push(`\r
`);
            }
          } else {
            buffers.push("$" + Buffer.byteLength(arg) + `\r
` + arg + `\r
`);
          }
        }
        result = buffers.toBuffer();
      } else {
        result = commandStr;
        for (let i = 0;i < this.args.length; ++i) {
          const arg = this.args[i];
          result += "$" + Buffer.byteLength(arg) + `\r
` + arg + `\r
`;
        }
      }
      return result;
    }
    stringifyArguments() {
      for (let i = 0;i < this.args.length; ++i) {
        const arg = this.args[i];
        if (typeof arg === "string") {} else if (arg instanceof Buffer) {
          this.bufferMode = true;
        } else {
          this.args[i] = (0, utils_1.toArg)(arg);
        }
      }
    }
    transformReply(result) {
      if (this.replyEncoding) {
        result = (0, utils_1.convertBufferToString)(result, this.replyEncoding);
      }
      const transformer = Command._transformer.reply[this.name];
      if (transformer) {
        result = transformer(result);
      }
      return result;
    }
    setTimeout(ms) {
      if (!this._commandTimeoutTimer) {
        this._commandTimeoutTimer = setTimeout(() => {
          if (!this.isResolved) {
            this.reject(new Error("Command timed out"));
          }
        }, ms);
      }
    }
    setBlockingTimeout(ms) {
      if (ms <= 0) {
        return;
      }
      if (this._blockingTimeoutTimer) {
        clearTimeout(this._blockingTimeoutTimer);
        this._blockingTimeoutTimer = undefined;
      }
      const now = Date.now();
      if (this._blockingDeadline === undefined) {
        this._blockingDeadline = now + ms;
      }
      const remaining = this._blockingDeadline - now;
      if (remaining <= 0) {
        this.resolve(null);
        return;
      }
      this._blockingTimeoutTimer = setTimeout(() => {
        if (this.isResolved) {
          this._blockingTimeoutTimer = undefined;
          return;
        }
        this._blockingTimeoutTimer = undefined;
        this.resolve(null);
      }, remaining);
    }
    extractBlockingTimeout() {
      const args = this.args;
      if (!args || args.length === 0) {
        return;
      }
      const name = this.name.toLowerCase();
      if (Command.checkFlag("LAST_ARG_TIMEOUT_COMMANDS", name)) {
        return (0, argumentParsers_1.parseSecondsArgument)(args[args.length - 1]);
      }
      if (Command.checkFlag("FIRST_ARG_TIMEOUT_COMMANDS", name)) {
        return (0, argumentParsers_1.parseSecondsArgument)(args[0]);
      }
      if (Command.checkFlag("BLOCK_OPTION_COMMANDS", name)) {
        return (0, argumentParsers_1.parseBlockOption)(args);
      }
      return;
    }
    _clearTimers() {
      const existingTimer = this._commandTimeoutTimer;
      if (existingTimer) {
        clearTimeout(existingTimer);
        delete this._commandTimeoutTimer;
      }
      const blockingTimer = this._blockingTimeoutTimer;
      if (blockingTimer) {
        clearTimeout(blockingTimer);
        delete this._blockingTimeoutTimer;
      }
    }
    initPromise() {
      const promise = new Promise((resolve, reject) => {
        if (!this.transformed) {
          this.transformed = true;
          const transformer = Command._transformer.argument[this.name];
          if (transformer) {
            this.args = transformer(this.args);
          }
          this.stringifyArguments();
        }
        this.resolve = this._convertValue(resolve);
        this.reject = (err) => {
          this._clearTimers();
          if (this.errorStack) {
            reject((0, utils_1.optimizeErrorStack)(err, this.errorStack.stack, __dirname));
          } else {
            reject(err);
          }
        };
      });
      this.promise = (0, standard_as_callback_1.default)(promise, this.callback);
    }
    _iterateKeys(transform = (key) => key) {
      if (typeof this.keys === "undefined") {
        this.keys = [];
        if ((0, commands_1.exists)(this.name, { caseInsensitive: true })) {
          const keyIndexes = (0, commands_1.getKeyIndexes)(this.name, this.args, {
            nameCaseInsensitive: true
          });
          for (const index of keyIndexes) {
            this.args[index] = transform(this.args[index]);
            this.keys.push(this.args[index]);
          }
        }
      }
      return this.keys;
    }
    _convertValue(resolve) {
      return (value) => {
        try {
          this._clearTimers();
          resolve(this.transformReply(value));
          this.isResolved = true;
        } catch (err) {
          this.reject(err);
        }
        return this.promise;
      };
    }
  }
  exports.default = Command;
  Command.FLAGS = {
    VALID_IN_SUBSCRIBER_MODE: [
      "subscribe",
      "psubscribe",
      "unsubscribe",
      "punsubscribe",
      "ssubscribe",
      "sunsubscribe",
      "ping",
      "quit"
    ],
    VALID_IN_MONITOR_MODE: ["monitor", "auth"],
    ENTER_SUBSCRIBER_MODE: ["subscribe", "psubscribe", "ssubscribe"],
    EXIT_SUBSCRIBER_MODE: ["unsubscribe", "punsubscribe", "sunsubscribe"],
    WILL_DISCONNECT: ["quit"],
    HANDSHAKE_COMMANDS: ["auth", "select", "client", "readonly", "info"],
    IGNORE_RECONNECT_ON_ERROR: ["client"],
    BLOCKING_COMMANDS: [
      "blpop",
      "brpop",
      "brpoplpush",
      "blmove",
      "bzpopmin",
      "bzpopmax",
      "bzmpop",
      "blmpop",
      "xread",
      "xreadgroup"
    ],
    LAST_ARG_TIMEOUT_COMMANDS: [
      "blpop",
      "brpop",
      "brpoplpush",
      "blmove",
      "bzpopmin",
      "bzpopmax"
    ],
    FIRST_ARG_TIMEOUT_COMMANDS: ["bzmpop", "blmpop"],
    BLOCK_OPTION_COMMANDS: ["xread", "xreadgroup"]
  };
  Command._transformer = {
    argument: {},
    reply: {}
  };
  var msetArgumentTransformer = function(args) {
    if (args.length === 1) {
      if (args[0] instanceof Map) {
        return (0, utils_1.convertMapToArray)(args[0]);
      }
      if (typeof args[0] === "object" && args[0] !== null) {
        return (0, utils_1.convertObjectToArray)(args[0]);
      }
    }
    return args;
  };
  var hsetArgumentTransformer = function(args) {
    if (args.length === 2) {
      if (args[1] instanceof Map) {
        return [args[0]].concat((0, utils_1.convertMapToArray)(args[1]));
      }
      if (typeof args[1] === "object" && args[1] !== null) {
        return [args[0]].concat((0, utils_1.convertObjectToArray)(args[1]));
      }
    }
    return args;
  };
  Command.setArgumentTransformer("mset", msetArgumentTransformer);
  Command.setArgumentTransformer("msetnx", msetArgumentTransformer);
  Command.setArgumentTransformer("hset", hsetArgumentTransformer);
  Command.setArgumentTransformer("hmset", hsetArgumentTransformer);
  Command.setReplyTransformer("hgetall", function(result) {
    if (Array.isArray(result)) {
      const obj = {};
      for (let i = 0;i < result.length; i += 2) {
        const key = result[i];
        const value = result[i + 1];
        if (key in obj) {
          Object.defineProperty(obj, key, {
            value,
            configurable: true,
            enumerable: true,
            writable: true
          });
        } else {
          obj[key] = value;
        }
      }
      return obj;
    }
    return result;
  });

  class MixedBuffers {
    constructor() {
      this.length = 0;
      this.items = [];
    }
    push(x) {
      this.length += Buffer.byteLength(x);
      this.items.push(x);
    }
    toBuffer() {
      const result = Buffer.allocUnsafe(this.length);
      let offset = 0;
      for (const item of this.items) {
        const length = Buffer.byteLength(item);
        Buffer.isBuffer(item) ? item.copy(result, offset) : result.write(item, offset, length);
        offset += length;
      }
      return result;
    }
  }
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/errors/ClusterAllFailedError.js
var require_ClusterAllFailedError = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var redis_errors_1 = require_redis_errors();

  class ClusterAllFailedError extends redis_errors_1.RedisError {
    constructor(message, lastNodeError) {
      super(message);
      this.lastNodeError = lastNodeError;
      Error.captureStackTrace(this, this.constructor);
    }
    get name() {
      return this.constructor.name;
    }
  }
  exports.default = ClusterAllFailedError;
  ClusterAllFailedError.defaultMessage = "Failed to refresh slots cache.";
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/ScanStream.js
var require_ScanStream = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var stream_1 = __require("stream");

  class ScanStream extends stream_1.Readable {
    constructor(opt) {
      super(opt);
      this.opt = opt;
      this._redisCursor = "0";
      this._redisDrained = false;
    }
    _read() {
      if (this._redisDrained) {
        this.push(null);
        return;
      }
      const args = [this._redisCursor];
      if (this.opt.key) {
        args.unshift(this.opt.key);
      }
      if (this.opt.match) {
        args.push("MATCH", this.opt.match);
      }
      if (this.opt.type) {
        args.push("TYPE", this.opt.type);
      }
      if (this.opt.count) {
        args.push("COUNT", String(this.opt.count));
      }
      if (this.opt.noValues) {
        args.push("NOVALUES");
      }
      this.opt.redis[this.opt.command](args, (err, res) => {
        if (err) {
          this.emit("error", err);
          return;
        }
        this._redisCursor = res[0] instanceof Buffer ? res[0].toString() : res[0];
        if (this._redisCursor === "0") {
          this._redisDrained = true;
        }
        this.push(res[1]);
      });
    }
    close() {
      this._redisDrained = true;
    }
  }
  exports.default = ScanStream;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/autoPipelining.js
var require_autoPipelining = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.executeWithAutoPipelining = exports.getFirstValueInFlattenedArray = exports.shouldUseAutoPipelining = exports.notAllowedAutoPipelineCommands = exports.kCallbacks = exports.kExec = undefined;
  var lodash_1 = require_lodash3();
  var calculateSlot = require_lib();
  var standard_as_callback_1 = require_built2();
  var commands_1 = require_built();
  exports.kExec = Symbol("exec");
  exports.kCallbacks = Symbol("callbacks");
  exports.notAllowedAutoPipelineCommands = [
    "auth",
    "info",
    "script",
    "quit",
    "cluster",
    "pipeline",
    "multi",
    "subscribe",
    "psubscribe",
    "unsubscribe",
    "unpsubscribe",
    "select",
    "client"
  ];
  function executeAutoPipeline(client, slotKey) {
    if (client._runningAutoPipelines.has(slotKey)) {
      return;
    }
    if (!client._autoPipelines.has(slotKey)) {
      return;
    }
    client._runningAutoPipelines.add(slotKey);
    const pipeline = client._autoPipelines.get(slotKey);
    client._autoPipelines.delete(slotKey);
    const callbacks = pipeline[exports.kCallbacks];
    pipeline[exports.kCallbacks] = null;
    pipeline.exec(function(err, results) {
      client._runningAutoPipelines.delete(slotKey);
      if (err) {
        for (let i = 0;i < callbacks.length; i++) {
          process.nextTick(callbacks[i], err);
        }
      } else {
        for (let i = 0;i < callbacks.length; i++) {
          process.nextTick(callbacks[i], ...results[i]);
        }
      }
      if (client._autoPipelines.has(slotKey)) {
        executeAutoPipeline(client, slotKey);
      }
    });
  }
  function shouldUseAutoPipelining(client, functionName, commandName) {
    return functionName && client.options.enableAutoPipelining && !client.isPipeline && !exports.notAllowedAutoPipelineCommands.includes(commandName) && !client.options.autoPipeliningIgnoredCommands.includes(commandName);
  }
  exports.shouldUseAutoPipelining = shouldUseAutoPipelining;
  function getFirstValueInFlattenedArray(args) {
    for (let i = 0;i < args.length; i++) {
      const arg = args[i];
      if (typeof arg === "string") {
        return arg;
      } else if (Array.isArray(arg) || (0, lodash_1.isArguments)(arg)) {
        if (arg.length === 0) {
          continue;
        }
        return arg[0];
      }
      const flattened = [arg].flat();
      if (flattened.length > 0) {
        return flattened[0];
      }
    }
    return;
  }
  exports.getFirstValueInFlattenedArray = getFirstValueInFlattenedArray;
  function executeWithAutoPipelining(client, functionName, commandName, args, callback) {
    if (client.isCluster && !client.slots.length) {
      if (client.status === "wait")
        client.connect().catch(lodash_1.noop);
      return (0, standard_as_callback_1.default)(new Promise(function(resolve, reject) {
        client.delayUntilReady((err) => {
          if (err) {
            reject(err);
            return;
          }
          executeWithAutoPipelining(client, functionName, commandName, args, null).then(resolve, reject);
        });
      }), callback);
    }
    const prefix = client.options.keyPrefix || "";
    let slotKey = client.isCluster ? client.slots[calculateSlot(`${prefix}${getFirstValueInFlattenedArray(args)}`)].join(",") : "main";
    if (client.isCluster && client.options.scaleReads !== "master") {
      const isReadOnly = (0, commands_1.exists)(commandName) && (0, commands_1.hasFlag)(commandName, "readonly");
      slotKey += isReadOnly ? ":read" : ":write";
    }
    if (!client._autoPipelines.has(slotKey)) {
      const pipeline2 = client.pipeline();
      pipeline2[exports.kExec] = false;
      pipeline2[exports.kCallbacks] = [];
      client._autoPipelines.set(slotKey, pipeline2);
    }
    const pipeline = client._autoPipelines.get(slotKey);
    if (!pipeline[exports.kExec]) {
      pipeline[exports.kExec] = true;
      setImmediate(executeAutoPipeline, client, slotKey);
    }
    const autoPipelinePromise = new Promise(function(resolve, reject) {
      pipeline[exports.kCallbacks].push(function(err, value) {
        if (err) {
          reject(err);
          return;
        }
        resolve(value);
      });
      if (functionName === "call") {
        args.unshift(commandName);
      }
      pipeline[functionName](...args);
    });
    return (0, standard_as_callback_1.default)(autoPipelinePromise, callback);
  }
  exports.executeWithAutoPipelining = executeWithAutoPipelining;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/Script.js
var require_Script = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var crypto_1 = __require("crypto");
  var Command_1 = require_Command();
  var standard_as_callback_1 = require_built2();

  class Script {
    constructor(lua, numberOfKeys = null, keyPrefix = "", readOnly = false) {
      this.lua = lua;
      this.numberOfKeys = numberOfKeys;
      this.keyPrefix = keyPrefix;
      this.readOnly = readOnly;
      this.sha = (0, crypto_1.createHash)("sha1").update(lua).digest("hex");
      const sha = this.sha;
      const socketHasScriptLoaded = new WeakSet;
      this.Command = class CustomScriptCommand extends Command_1.default {
        toWritable(socket) {
          const origReject = this.reject;
          this.reject = (err) => {
            if (err.message.indexOf("NOSCRIPT") !== -1) {
              socketHasScriptLoaded.delete(socket);
            }
            origReject.call(this, err);
          };
          if (!socketHasScriptLoaded.has(socket)) {
            socketHasScriptLoaded.add(socket);
            this.name = "eval";
            this.args[0] = lua;
          } else if (this.name === "eval") {
            this.name = "evalsha";
            this.args[0] = sha;
          }
          return super.toWritable(socket);
        }
      };
    }
    execute(container, args, options, callback) {
      if (typeof this.numberOfKeys === "number") {
        args.unshift(this.numberOfKeys);
      }
      if (this.keyPrefix) {
        options.keyPrefix = this.keyPrefix;
      }
      if (this.readOnly) {
        options.readOnly = true;
      }
      const evalsha = new this.Command("evalsha", [this.sha, ...args], options);
      evalsha.promise = evalsha.promise.catch((err) => {
        if (err.message.indexOf("NOSCRIPT") === -1) {
          throw err;
        }
        const resend = new this.Command("evalsha", [this.sha, ...args], options);
        const client = container.isPipeline ? container.redis : container;
        return client.sendCommand(resend);
      });
      (0, standard_as_callback_1.default)(evalsha.promise, callback);
      return container.sendCommand(evalsha);
    }
  }
  exports.default = Script;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/utils/Commander.js
var require_Commander = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var commands_1 = require_built();
  var autoPipelining_1 = require_autoPipelining();
  var Command_1 = require_Command();
  var Script_1 = require_Script();

  class Commander {
    constructor() {
      this.options = {};
      this.scriptsSet = {};
      this.addedBuiltinSet = new Set;
    }
    getBuiltinCommands() {
      return commands.slice(0);
    }
    createBuiltinCommand(commandName) {
      return {
        string: generateFunction(null, commandName, "utf8"),
        buffer: generateFunction(null, commandName, null)
      };
    }
    addBuiltinCommand(commandName) {
      this.addedBuiltinSet.add(commandName);
      this[commandName] = generateFunction(commandName, commandName, "utf8");
      this[commandName + "Buffer"] = generateFunction(commandName + "Buffer", commandName, null);
    }
    defineCommand(name, definition) {
      const script = new Script_1.default(definition.lua, definition.numberOfKeys, this.options.keyPrefix, definition.readOnly);
      this.scriptsSet[name] = script;
      this[name] = generateScriptingFunction(name, name, script, "utf8");
      this[name + "Buffer"] = generateScriptingFunction(name + "Buffer", name, script, null);
    }
    sendCommand(command, stream, node) {
      throw new Error('"sendCommand" is not implemented');
    }
  }
  var commands = commands_1.list.filter((command) => command !== "monitor");
  commands.push("sentinel");
  commands.forEach(function(commandName) {
    Commander.prototype[commandName] = generateFunction(commandName, commandName, "utf8");
    Commander.prototype[commandName + "Buffer"] = generateFunction(commandName + "Buffer", commandName, null);
  });
  Commander.prototype.call = generateFunction("call", "utf8");
  Commander.prototype.callBuffer = generateFunction("callBuffer", null);
  Commander.prototype.send_command = Commander.prototype.call;
  function generateFunction(functionName, _commandName, _encoding) {
    if (typeof _encoding === "undefined") {
      _encoding = _commandName;
      _commandName = null;
    }
    return function(...args) {
      const commandName = _commandName || args.shift();
      let callback = args[args.length - 1];
      if (typeof callback === "function") {
        args.pop();
      } else {
        callback = undefined;
      }
      const options = {
        errorStack: this.options.showFriendlyErrorStack ? new Error : undefined,
        keyPrefix: this.options.keyPrefix,
        replyEncoding: _encoding
      };
      if (!(0, autoPipelining_1.shouldUseAutoPipelining)(this, functionName, commandName)) {
        return this.sendCommand(new Command_1.default(commandName, args, options, callback));
      }
      return (0, autoPipelining_1.executeWithAutoPipelining)(this, functionName, commandName, args, callback);
    };
  }
  function generateScriptingFunction(functionName, commandName, script, encoding) {
    return function(...args) {
      const callback = typeof args[args.length - 1] === "function" ? args.pop() : undefined;
      const options = {
        replyEncoding: encoding
      };
      if (this.options.showFriendlyErrorStack) {
        options.errorStack = new Error;
      }
      if (!(0, autoPipelining_1.shouldUseAutoPipelining)(this, functionName, commandName)) {
        return script.execute(this, args, options, callback);
      }
      return (0, autoPipelining_1.executeWithAutoPipelining)(this, functionName, commandName, args, callback);
    };
  }
  exports.default = Commander;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/Pipeline.js
var require_Pipeline = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var calculateSlot = require_lib();
  var commands_1 = require_built();
  var standard_as_callback_1 = require_built2();
  var util_1 = __require("util");
  var Command_1 = require_Command();
  var utils_1 = require_utils2();
  var Commander_1 = require_Commander();
  function generateMultiWithNodes(redis, keys) {
    const slot = calculateSlot(keys[0]);
    const target = redis._groupsBySlot[slot];
    for (let i = 1;i < keys.length; i++) {
      if (redis._groupsBySlot[calculateSlot(keys[i])] !== target) {
        return -1;
      }
    }
    return slot;
  }

  class Pipeline extends Commander_1.default {
    constructor(redis) {
      super();
      this.redis = redis;
      this.isPipeline = true;
      this.replyPending = 0;
      this._queue = [];
      this._result = [];
      this._transactions = 0;
      this._shaToScript = {};
      this.isCluster = this.redis.constructor.name === "Cluster" || this.redis.isCluster;
      this.options = redis.options;
      Object.keys(redis.scriptsSet).forEach((name) => {
        const script = redis.scriptsSet[name];
        this._shaToScript[script.sha] = script;
        this[name] = redis[name];
        this[name + "Buffer"] = redis[name + "Buffer"];
      });
      redis.addedBuiltinSet.forEach((name) => {
        this[name] = redis[name];
        this[name + "Buffer"] = redis[name + "Buffer"];
      });
      this.promise = new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
      const _this = this;
      Object.defineProperty(this, "length", {
        get: function() {
          return _this._queue.length;
        }
      });
    }
    fillResult(value, position) {
      if (this._queue[position].name === "exec" && Array.isArray(value[1])) {
        const execLength = value[1].length;
        for (let i = 0;i < execLength; i++) {
          if (value[1][i] instanceof Error) {
            continue;
          }
          const cmd = this._queue[position - (execLength - i)];
          try {
            value[1][i] = cmd.transformReply(value[1][i]);
          } catch (err) {
            value[1][i] = err;
          }
        }
      }
      this._result[position] = value;
      if (--this.replyPending) {
        return;
      }
      if (this.isCluster) {
        let retriable = true;
        let commonError;
        for (let i = 0;i < this._result.length; ++i) {
          const error = this._result[i][0];
          const command = this._queue[i];
          if (error) {
            if (command.name === "exec" && error.message === "EXECABORT Transaction discarded because of previous errors.") {
              continue;
            }
            if (!commonError) {
              commonError = {
                name: error.name,
                message: error.message
              };
            } else if (commonError.name !== error.name || commonError.message !== error.message) {
              retriable = false;
              break;
            }
          } else if (!command.inTransaction) {
            const isReadOnly = (0, commands_1.exists)(command.name, { caseInsensitive: true }) && (0, commands_1.hasFlag)(command.name, "readonly", { nameCaseInsensitive: true });
            if (!isReadOnly) {
              retriable = false;
              break;
            }
          }
        }
        if (commonError && retriable) {
          const _this = this;
          const errv = commonError.message.split(" ");
          const queue = this._queue;
          let inTransaction = false;
          this._queue = [];
          for (let i = 0;i < queue.length; ++i) {
            if (errv[0] === "ASK" && !inTransaction && queue[i].name !== "asking" && (!queue[i - 1] || queue[i - 1].name !== "asking")) {
              const asking = new Command_1.default("asking");
              asking.ignore = true;
              this.sendCommand(asking);
            }
            queue[i].initPromise();
            this.sendCommand(queue[i]);
            inTransaction = queue[i].inTransaction;
          }
          let matched = true;
          if (typeof this.leftRedirections === "undefined") {
            this.leftRedirections = {};
          }
          const exec = function() {
            _this.exec();
          };
          const cluster = this.redis;
          cluster.handleError(commonError, this.leftRedirections, {
            moved: function(_slot, key) {
              _this.preferKey = key;
              if (cluster.slots[errv[1]]) {
                if (cluster.slots[errv[1]][0] !== key) {
                  cluster.slots[errv[1]] = [key];
                }
              } else {
                cluster.slots[errv[1]] = [key];
              }
              cluster._groupsBySlot[errv[1]] = cluster._groupsIds[cluster.slots[errv[1]].join(";")];
              cluster.refreshSlotsCache();
              _this.exec();
            },
            ask: function(_slot, key) {
              _this.preferKey = key;
              _this.exec();
            },
            tryagain: exec,
            clusterDown: exec,
            connectionClosed: exec,
            maxRedirections: () => {
              matched = false;
            },
            defaults: () => {
              matched = false;
            }
          });
          if (matched) {
            return;
          }
        }
      }
      let ignoredCount = 0;
      for (let i = 0;i < this._queue.length - ignoredCount; ++i) {
        if (this._queue[i + ignoredCount].ignore) {
          ignoredCount += 1;
        }
        this._result[i] = this._result[i + ignoredCount];
      }
      this.resolve(this._result.slice(0, this._result.length - ignoredCount));
    }
    sendCommand(command) {
      if (this._transactions > 0) {
        command.inTransaction = true;
      }
      const position = this._queue.length;
      command.pipelineIndex = position;
      command.promise.then((result) => {
        this.fillResult([null, result], position);
      }).catch((error) => {
        this.fillResult([error], position);
      });
      this._queue.push(command);
      return this;
    }
    addBatch(commands) {
      let command, commandName, args;
      for (let i = 0;i < commands.length; ++i) {
        command = commands[i];
        commandName = command[0];
        args = command.slice(1);
        this[commandName].apply(this, args);
      }
      return this;
    }
  }
  exports.default = Pipeline;
  var multi = Pipeline.prototype.multi;
  Pipeline.prototype.multi = function() {
    this._transactions += 1;
    return multi.apply(this, arguments);
  };
  var execBuffer = Pipeline.prototype.execBuffer;
  Pipeline.prototype.execBuffer = (0, util_1.deprecate)(function() {
    if (this._transactions > 0) {
      this._transactions -= 1;
    }
    return execBuffer.apply(this, arguments);
  }, "Pipeline#execBuffer: Use Pipeline#exec instead");
  Pipeline.prototype.exec = function(callback) {
    if (this.isCluster && !this.redis.slots.length) {
      if (this.redis.status === "wait")
        this.redis.connect().catch(utils_1.noop);
      if (callback && !this.nodeifiedPromise) {
        this.nodeifiedPromise = true;
        (0, standard_as_callback_1.default)(this.promise, callback);
      }
      this.redis.delayUntilReady((err) => {
        if (err) {
          this.reject(err);
          return;
        }
        this.exec(callback);
      });
      return this.promise;
    }
    if (this._transactions > 0) {
      this._transactions -= 1;
      return execBuffer.apply(this, arguments);
    }
    if (!this.nodeifiedPromise) {
      this.nodeifiedPromise = true;
      (0, standard_as_callback_1.default)(this.promise, callback);
    }
    if (!this._queue.length) {
      this.resolve([]);
    }
    let pipelineSlot;
    if (this.isCluster) {
      const sampleKeys = [];
      for (let i = 0;i < this._queue.length; i++) {
        const keys = this._queue[i].getKeys();
        if (keys.length) {
          sampleKeys.push(keys[0]);
        }
        if (keys.length && calculateSlot.generateMulti(keys) < 0) {
          this.reject(new Error("All the keys in a pipeline command should belong to the same slot"));
          return this.promise;
        }
      }
      if (sampleKeys.length) {
        pipelineSlot = generateMultiWithNodes(this.redis, sampleKeys);
        if (pipelineSlot < 0) {
          this.reject(new Error("All keys in the pipeline should belong to the same slots allocation group"));
          return this.promise;
        }
      } else {
        pipelineSlot = Math.random() * 16384 | 0;
      }
    }
    const _this = this;
    execPipeline();
    return this.promise;
    function execPipeline() {
      let writePending = _this.replyPending = _this._queue.length;
      let node;
      if (_this.isCluster) {
        node = {
          slot: pipelineSlot,
          redis: _this.redis.connectionPool.nodes.all[_this.preferKey]
        };
      }
      let data = "";
      let buffers;
      const stream = {
        isPipeline: true,
        destination: _this.isCluster ? node : { redis: _this.redis },
        write(writable) {
          if (typeof writable !== "string") {
            if (!buffers) {
              buffers = [];
            }
            if (data) {
              buffers.push(Buffer.from(data, "utf8"));
              data = "";
            }
            buffers.push(writable);
          } else {
            data += writable;
          }
          if (!--writePending) {
            if (buffers) {
              if (data) {
                buffers.push(Buffer.from(data, "utf8"));
              }
              stream.destination.redis.stream.write(Buffer.concat(buffers));
            } else {
              stream.destination.redis.stream.write(data);
            }
            writePending = _this._queue.length;
            data = "";
            buffers = undefined;
          }
        }
      };
      for (let i = 0;i < _this._queue.length; ++i) {
        _this.redis.sendCommand(_this._queue[i], stream, node);
      }
      return _this.promise;
    }
  };
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/transaction.js
var require_transaction = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.addTransactionSupport = undefined;
  var utils_1 = require_utils2();
  var standard_as_callback_1 = require_built2();
  var Pipeline_1 = require_Pipeline();
  function addTransactionSupport(redis) {
    redis.pipeline = function(commands) {
      const pipeline = new Pipeline_1.default(this);
      if (Array.isArray(commands)) {
        pipeline.addBatch(commands);
      }
      return pipeline;
    };
    const { multi } = redis;
    redis.multi = function(commands, options) {
      if (typeof options === "undefined" && !Array.isArray(commands)) {
        options = commands;
        commands = null;
      }
      if (options && options.pipeline === false) {
        return multi.call(this);
      }
      const pipeline = new Pipeline_1.default(this);
      pipeline.multi();
      if (Array.isArray(commands)) {
        pipeline.addBatch(commands);
      }
      const exec2 = pipeline.exec;
      pipeline.exec = function(callback) {
        if (this.isCluster && !this.redis.slots.length) {
          if (this.redis.status === "wait")
            this.redis.connect().catch(utils_1.noop);
          return (0, standard_as_callback_1.default)(new Promise((resolve, reject) => {
            this.redis.delayUntilReady((err) => {
              if (err) {
                reject(err);
                return;
              }
              this.exec(pipeline).then(resolve, reject);
            });
          }), callback);
        }
        if (this._transactions > 0) {
          exec2.call(pipeline);
        }
        if (this.nodeifiedPromise) {
          return exec2.call(pipeline);
        }
        const promise = exec2.call(pipeline);
        return (0, standard_as_callback_1.default)(promise.then(function(result) {
          const execResult = result[result.length - 1];
          if (typeof execResult === "undefined") {
            throw new Error("Pipeline cannot be used to send any commands when the `exec()` has been called on it.");
          }
          if (execResult[0]) {
            execResult[0].previousErrors = [];
            for (let i = 0;i < result.length - 1; ++i) {
              if (result[i][0]) {
                execResult[0].previousErrors.push(result[i][0]);
              }
            }
            throw execResult[0];
          }
          return (0, utils_1.wrapMultiResult)(execResult[1]);
        }), callback);
      };
      const { execBuffer } = pipeline;
      pipeline.execBuffer = function(callback) {
        if (this._transactions > 0) {
          execBuffer.call(pipeline);
        }
        return pipeline.exec(callback);
      };
      return pipeline;
    };
    const { exec } = redis;
    redis.exec = function(callback) {
      return (0, standard_as_callback_1.default)(exec.call(this).then(function(results) {
        if (Array.isArray(results)) {
          results = (0, utils_1.wrapMultiResult)(results);
        }
        return results;
      }), callback);
    };
  }
  exports.addTransactionSupport = addTransactionSupport;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/utils/applyMixin.js
var require_applyMixin = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  function applyMixin(derivedConstructor, mixinConstructor) {
    Object.getOwnPropertyNames(mixinConstructor.prototype).forEach((name) => {
      Object.defineProperty(derivedConstructor.prototype, name, Object.getOwnPropertyDescriptor(mixinConstructor.prototype, name));
    });
  }
  exports.default = applyMixin;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/cluster/ClusterOptions.js
var require_ClusterOptions = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.DEFAULT_CLUSTER_OPTIONS = undefined;
  var dns_1 = __require("dns");
  exports.DEFAULT_CLUSTER_OPTIONS = {
    clusterRetryStrategy: (times) => Math.min(100 + times * 2, 2000),
    enableOfflineQueue: true,
    enableReadyCheck: true,
    scaleReads: "master",
    maxRedirections: 16,
    retryDelayOnMoved: 0,
    retryDelayOnFailover: 100,
    retryDelayOnClusterDown: 100,
    retryDelayOnTryAgain: 100,
    slotsRefreshTimeout: 1000,
    useSRVRecords: false,
    resolveSrv: dns_1.resolveSrv,
    dnsLookup: dns_1.lookup,
    enableAutoPipelining: false,
    autoPipeliningIgnoredCommands: [],
    shardedSubscribers: false
  };
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/cluster/util.js
var require_util = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.getConnectionName = exports.weightSrvRecords = exports.groupSrvRecords = exports.getUniqueHostnamesFromOptions = exports.normalizeNodeOptions = exports.nodeKeyToRedisOptions = exports.getNodeKey = undefined;
  var utils_1 = require_utils2();
  var net_1 = __require("net");
  function getNodeKey(node) {
    node.port = node.port || 6379;
    node.host = node.host || "127.0.0.1";
    return node.host + ":" + node.port;
  }
  exports.getNodeKey = getNodeKey;
  function nodeKeyToRedisOptions(nodeKey) {
    const portIndex = nodeKey.lastIndexOf(":");
    if (portIndex === -1) {
      throw new Error(`Invalid node key ${nodeKey}`);
    }
    return {
      host: nodeKey.slice(0, portIndex),
      port: Number(nodeKey.slice(portIndex + 1))
    };
  }
  exports.nodeKeyToRedisOptions = nodeKeyToRedisOptions;
  function normalizeNodeOptions(nodes) {
    return nodes.map((node) => {
      const options = {};
      if (typeof node === "object") {
        Object.assign(options, node);
      } else if (typeof node === "string") {
        Object.assign(options, (0, utils_1.parseURL)(node));
      } else if (typeof node === "number") {
        options.port = node;
      } else {
        throw new Error("Invalid argument " + node);
      }
      if (typeof options.port === "string") {
        options.port = parseInt(options.port, 10);
      }
      delete options.db;
      if (!options.port) {
        options.port = 6379;
      }
      if (!options.host) {
        options.host = "127.0.0.1";
      }
      return (0, utils_1.resolveTLSProfile)(options);
    });
  }
  exports.normalizeNodeOptions = normalizeNodeOptions;
  function getUniqueHostnamesFromOptions(nodes) {
    const uniqueHostsMap = {};
    nodes.forEach((node) => {
      uniqueHostsMap[node.host] = true;
    });
    return Object.keys(uniqueHostsMap).filter((host) => !(0, net_1.isIP)(host));
  }
  exports.getUniqueHostnamesFromOptions = getUniqueHostnamesFromOptions;
  function groupSrvRecords(records) {
    const recordsByPriority = {};
    for (const record of records) {
      if (!recordsByPriority.hasOwnProperty(record.priority)) {
        recordsByPriority[record.priority] = {
          totalWeight: record.weight,
          records: [record]
        };
      } else {
        recordsByPriority[record.priority].totalWeight += record.weight;
        recordsByPriority[record.priority].records.push(record);
      }
    }
    return recordsByPriority;
  }
  exports.groupSrvRecords = groupSrvRecords;
  function weightSrvRecords(recordsGroup) {
    if (recordsGroup.records.length === 1) {
      recordsGroup.totalWeight = 0;
      return recordsGroup.records.shift();
    }
    const random = Math.floor(Math.random() * (recordsGroup.totalWeight + recordsGroup.records.length));
    let total = 0;
    for (const [i, record] of recordsGroup.records.entries()) {
      total += 1 + record.weight;
      if (total > random) {
        recordsGroup.totalWeight -= record.weight;
        recordsGroup.records.splice(i, 1);
        return record;
      }
    }
  }
  exports.weightSrvRecords = weightSrvRecords;
  function getConnectionName(component, nodeConnectionName) {
    const prefix = `ioredis-cluster(${component})`;
    return nodeConnectionName ? `${prefix}:${nodeConnectionName}` : prefix;
  }
  exports.getConnectionName = getConnectionName;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/cluster/ClusterSubscriber.js
var require_ClusterSubscriber = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var util_1 = require_util();
  var utils_1 = require_utils2();
  var Redis_1 = require_Redis();
  var debug = (0, utils_1.Debug)("cluster:subscriber");

  class ClusterSubscriber {
    constructor(connectionPool, emitter, isSharded = false) {
      this.connectionPool = connectionPool;
      this.emitter = emitter;
      this.isSharded = isSharded;
      this.started = false;
      this.subscriber = null;
      this.slotRange = [];
      this.onSubscriberEnd = () => {
        if (!this.started) {
          debug("subscriber has disconnected, but ClusterSubscriber is not started, so not reconnecting.");
          return;
        }
        debug("subscriber has disconnected, selecting a new one...");
        this.selectSubscriber();
      };
      this.connectionPool.on("-node", (_, key) => {
        if (!this.started || !this.subscriber) {
          return;
        }
        if ((0, util_1.getNodeKey)(this.subscriber.options) === key) {
          debug("subscriber has left, selecting a new one...");
          this.selectSubscriber();
        }
      });
      this.connectionPool.on("+node", () => {
        if (!this.started || this.subscriber) {
          return;
        }
        debug("a new node is discovered and there is no subscriber, selecting a new one...");
        this.selectSubscriber();
      });
    }
    getInstance() {
      return this.subscriber;
    }
    associateSlotRange(range) {
      if (this.isSharded) {
        this.slotRange = range;
      }
      return this.slotRange;
    }
    start() {
      this.started = true;
      this.selectSubscriber();
      debug("started");
    }
    stop() {
      this.started = false;
      if (this.subscriber) {
        this.subscriber.disconnect();
        this.subscriber = null;
      }
    }
    isStarted() {
      return this.started;
    }
    selectSubscriber() {
      const lastActiveSubscriber = this.lastActiveSubscriber;
      if (lastActiveSubscriber) {
        lastActiveSubscriber.off("end", this.onSubscriberEnd);
        lastActiveSubscriber.disconnect();
      }
      if (this.subscriber) {
        this.subscriber.off("end", this.onSubscriberEnd);
        this.subscriber.disconnect();
      }
      const sampleNode = (0, utils_1.sample)(this.connectionPool.getNodes());
      if (!sampleNode) {
        debug("selecting subscriber failed since there is no node discovered in the cluster yet");
        this.subscriber = null;
        return;
      }
      const { options } = sampleNode;
      debug("selected a subscriber %s:%s", options.host, options.port);
      let connectionPrefix = "subscriber";
      if (this.isSharded)
        connectionPrefix = "ssubscriber";
      this.subscriber = new Redis_1.default({
        port: options.port,
        host: options.host,
        username: options.username,
        password: options.password,
        enableReadyCheck: true,
        connectionName: (0, util_1.getConnectionName)(connectionPrefix, options.connectionName),
        lazyConnect: true,
        tls: options.tls,
        retryStrategy: null
      });
      this.subscriber.on("error", utils_1.noop);
      this.subscriber.on("moved", () => {
        this.emitter.emit("forceRefresh");
      });
      this.subscriber.once("end", this.onSubscriberEnd);
      const previousChannels = { subscribe: [], psubscribe: [], ssubscribe: [] };
      if (lastActiveSubscriber) {
        const condition = lastActiveSubscriber.condition || lastActiveSubscriber.prevCondition;
        if (condition && condition.subscriber) {
          previousChannels.subscribe = condition.subscriber.channels("subscribe");
          previousChannels.psubscribe = condition.subscriber.channels("psubscribe");
          previousChannels.ssubscribe = condition.subscriber.channels("ssubscribe");
        }
      }
      if (previousChannels.subscribe.length || previousChannels.psubscribe.length || previousChannels.ssubscribe.length) {
        let pending = 0;
        for (const type of ["subscribe", "psubscribe", "ssubscribe"]) {
          const channels = previousChannels[type];
          if (channels.length == 0) {
            continue;
          }
          debug("%s %d channels", type, channels.length);
          if (type === "ssubscribe") {
            for (const channel of channels) {
              pending += 1;
              this.subscriber[type](channel).then(() => {
                if (!--pending) {
                  this.lastActiveSubscriber = this.subscriber;
                }
              }).catch(() => {
                debug("failed to ssubscribe to channel: %s", channel);
              });
            }
          } else {
            pending += 1;
            this.subscriber[type](channels).then(() => {
              if (!--pending) {
                this.lastActiveSubscriber = this.subscriber;
              }
            }).catch(() => {
              debug("failed to %s %d channels", type, channels.length);
            });
          }
        }
      } else {
        this.lastActiveSubscriber = this.subscriber;
      }
      for (const event of [
        "message",
        "messageBuffer"
      ]) {
        this.subscriber.on(event, (arg1, arg2) => {
          this.emitter.emit(event, arg1, arg2);
        });
      }
      for (const event of ["pmessage", "pmessageBuffer"]) {
        this.subscriber.on(event, (arg1, arg2, arg3) => {
          this.emitter.emit(event, arg1, arg2, arg3);
        });
      }
      if (this.isSharded == true) {
        for (const event of [
          "smessage",
          "smessageBuffer"
        ]) {
          this.subscriber.on(event, (arg1, arg2) => {
            this.emitter.emit(event, arg1, arg2);
          });
        }
      }
    }
  }
  exports.default = ClusterSubscriber;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/cluster/ConnectionPool.js
var require_ConnectionPool = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var events_1 = __require("events");
  var utils_1 = require_utils2();
  var util_1 = require_util();
  var Redis_1 = require_Redis();
  var debug = (0, utils_1.Debug)("cluster:connectionPool");

  class ConnectionPool extends events_1.EventEmitter {
    constructor(redisOptions) {
      super();
      this.redisOptions = redisOptions;
      this.nodes = {
        all: {},
        master: {},
        slave: {}
      };
      this.specifiedOptions = {};
    }
    getNodes(role = "all") {
      const nodes = this.nodes[role];
      return Object.keys(nodes).map((key) => nodes[key]);
    }
    getInstanceByKey(key) {
      return this.nodes.all[key];
    }
    getSampleInstance(role) {
      const keys = Object.keys(this.nodes[role]);
      const sampleKey = (0, utils_1.sample)(keys);
      return this.nodes[role][sampleKey];
    }
    addMasterNode(node) {
      const key = (0, util_1.getNodeKey)(node.options);
      const redis = this.createRedisFromOptions(node, node.options.readOnly);
      if (!node.options.readOnly) {
        this.nodes.all[key] = redis;
        this.nodes.master[key] = redis;
        return true;
      }
      return false;
    }
    createRedisFromOptions(node, readOnly) {
      const redis = new Redis_1.default((0, utils_1.defaults)({
        retryStrategy: null,
        enableOfflineQueue: true,
        readOnly
      }, node, this.redisOptions, { lazyConnect: true }));
      return redis;
    }
    findOrCreate(node, readOnly = false) {
      const key = (0, util_1.getNodeKey)(node);
      readOnly = Boolean(readOnly);
      if (this.specifiedOptions[key]) {
        Object.assign(node, this.specifiedOptions[key]);
      } else {
        this.specifiedOptions[key] = node;
      }
      let redis;
      if (this.nodes.all[key]) {
        redis = this.nodes.all[key];
        if (redis.options.readOnly !== readOnly) {
          redis.options.readOnly = readOnly;
          debug("Change role of %s to %s", key, readOnly ? "slave" : "master");
          redis[readOnly ? "readonly" : "readwrite"]().catch(utils_1.noop);
          if (readOnly) {
            delete this.nodes.master[key];
            this.nodes.slave[key] = redis;
          } else {
            delete this.nodes.slave[key];
            this.nodes.master[key] = redis;
          }
        }
      } else {
        debug("Connecting to %s as %s", key, readOnly ? "slave" : "master");
        redis = this.createRedisFromOptions(node, readOnly);
        this.nodes.all[key] = redis;
        this.nodes[readOnly ? "slave" : "master"][key] = redis;
        redis.once("end", () => {
          this.removeNode(key);
          this.emit("-node", redis, key);
          if (!Object.keys(this.nodes.all).length) {
            this.emit("drain");
          }
        });
        this.emit("+node", redis, key);
        redis.on("error", function(error) {
          this.emit("nodeError", error, key);
        });
      }
      return redis;
    }
    reset(nodes) {
      debug("Reset with %O", nodes);
      const newNodes = {};
      nodes.forEach((node) => {
        const key = (0, util_1.getNodeKey)(node);
        if (!(node.readOnly && newNodes[key])) {
          newNodes[key] = node;
        }
      });
      Object.keys(this.nodes.all).forEach((key) => {
        if (!newNodes[key]) {
          debug("Disconnect %s because the node does not hold any slot", key);
          this.nodes.all[key].disconnect();
          this.removeNode(key);
        }
      });
      Object.keys(newNodes).forEach((key) => {
        const node = newNodes[key];
        this.findOrCreate(node, node.readOnly);
      });
    }
    removeNode(key) {
      const { nodes } = this;
      if (nodes.all[key]) {
        debug("Remove %s from the pool", key);
        delete nodes.all[key];
      }
      delete nodes.master[key];
      delete nodes.slave[key];
    }
  }
  exports.default = ConnectionPool;
});

// node_modules/.bun/denque@2.1.0/node_modules/denque/index.js
var require_denque = __commonJS((exports, module) => {
  function Denque(array, options) {
    var options = options || {};
    this._capacity = options.capacity;
    this._head = 0;
    this._tail = 0;
    if (Array.isArray(array)) {
      this._fromArray(array);
    } else {
      this._capacityMask = 3;
      this._list = new Array(4);
    }
  }
  Denque.prototype.peekAt = function peekAt(index) {
    var i = index;
    if (i !== (i | 0)) {
      return;
    }
    var len = this.size();
    if (i >= len || i < -len)
      return;
    if (i < 0)
      i += len;
    i = this._head + i & this._capacityMask;
    return this._list[i];
  };
  Denque.prototype.get = function get(i) {
    return this.peekAt(i);
  };
  Denque.prototype.peek = function peek() {
    if (this._head === this._tail)
      return;
    return this._list[this._head];
  };
  Denque.prototype.peekFront = function peekFront() {
    return this.peek();
  };
  Denque.prototype.peekBack = function peekBack() {
    return this.peekAt(-1);
  };
  Object.defineProperty(Denque.prototype, "length", {
    get: function length() {
      return this.size();
    }
  });
  Denque.prototype.size = function size() {
    if (this._head === this._tail)
      return 0;
    if (this._head < this._tail)
      return this._tail - this._head;
    else
      return this._capacityMask + 1 - (this._head - this._tail);
  };
  Denque.prototype.unshift = function unshift(item) {
    if (arguments.length === 0)
      return this.size();
    var len = this._list.length;
    this._head = this._head - 1 + len & this._capacityMask;
    this._list[this._head] = item;
    if (this._tail === this._head)
      this._growArray();
    if (this._capacity && this.size() > this._capacity)
      this.pop();
    if (this._head < this._tail)
      return this._tail - this._head;
    else
      return this._capacityMask + 1 - (this._head - this._tail);
  };
  Denque.prototype.shift = function shift() {
    var head = this._head;
    if (head === this._tail)
      return;
    var item = this._list[head];
    this._list[head] = undefined;
    this._head = head + 1 & this._capacityMask;
    if (head < 2 && this._tail > 1e4 && this._tail <= this._list.length >>> 2)
      this._shrinkArray();
    return item;
  };
  Denque.prototype.push = function push(item) {
    if (arguments.length === 0)
      return this.size();
    var tail = this._tail;
    this._list[tail] = item;
    this._tail = tail + 1 & this._capacityMask;
    if (this._tail === this._head) {
      this._growArray();
    }
    if (this._capacity && this.size() > this._capacity) {
      this.shift();
    }
    if (this._head < this._tail)
      return this._tail - this._head;
    else
      return this._capacityMask + 1 - (this._head - this._tail);
  };
  Denque.prototype.pop = function pop() {
    var tail = this._tail;
    if (tail === this._head)
      return;
    var len = this._list.length;
    this._tail = tail - 1 + len & this._capacityMask;
    var item = this._list[this._tail];
    this._list[this._tail] = undefined;
    if (this._head < 2 && tail > 1e4 && tail <= len >>> 2)
      this._shrinkArray();
    return item;
  };
  Denque.prototype.removeOne = function removeOne(index) {
    var i = index;
    if (i !== (i | 0)) {
      return;
    }
    if (this._head === this._tail)
      return;
    var size = this.size();
    var len = this._list.length;
    if (i >= size || i < -size)
      return;
    if (i < 0)
      i += size;
    i = this._head + i & this._capacityMask;
    var item = this._list[i];
    var k;
    if (index < size / 2) {
      for (k = index;k > 0; k--) {
        this._list[i] = this._list[i = i - 1 + len & this._capacityMask];
      }
      this._list[i] = undefined;
      this._head = this._head + 1 + len & this._capacityMask;
    } else {
      for (k = size - 1 - index;k > 0; k--) {
        this._list[i] = this._list[i = i + 1 + len & this._capacityMask];
      }
      this._list[i] = undefined;
      this._tail = this._tail - 1 + len & this._capacityMask;
    }
    return item;
  };
  Denque.prototype.remove = function remove(index, count) {
    var i = index;
    var removed;
    var del_count = count;
    if (i !== (i | 0)) {
      return;
    }
    if (this._head === this._tail)
      return;
    var size = this.size();
    var len = this._list.length;
    if (i >= size || i < -size || count < 1)
      return;
    if (i < 0)
      i += size;
    if (count === 1 || !count) {
      removed = new Array(1);
      removed[0] = this.removeOne(i);
      return removed;
    }
    if (i === 0 && i + count >= size) {
      removed = this.toArray();
      this.clear();
      return removed;
    }
    if (i + count > size)
      count = size - i;
    var k;
    removed = new Array(count);
    for (k = 0;k < count; k++) {
      removed[k] = this._list[this._head + i + k & this._capacityMask];
    }
    i = this._head + i & this._capacityMask;
    if (index + count === size) {
      this._tail = this._tail - count + len & this._capacityMask;
      for (k = count;k > 0; k--) {
        this._list[i = i + 1 + len & this._capacityMask] = undefined;
      }
      return removed;
    }
    if (index === 0) {
      this._head = this._head + count + len & this._capacityMask;
      for (k = count - 1;k > 0; k--) {
        this._list[i = i + 1 + len & this._capacityMask] = undefined;
      }
      return removed;
    }
    if (i < size / 2) {
      this._head = this._head + index + count + len & this._capacityMask;
      for (k = index;k > 0; k--) {
        this.unshift(this._list[i = i - 1 + len & this._capacityMask]);
      }
      i = this._head - 1 + len & this._capacityMask;
      while (del_count > 0) {
        this._list[i = i - 1 + len & this._capacityMask] = undefined;
        del_count--;
      }
      if (index < 0)
        this._tail = i;
    } else {
      this._tail = i;
      i = i + count + len & this._capacityMask;
      for (k = size - (count + index);k > 0; k--) {
        this.push(this._list[i++]);
      }
      i = this._tail;
      while (del_count > 0) {
        this._list[i = i + 1 + len & this._capacityMask] = undefined;
        del_count--;
      }
    }
    if (this._head < 2 && this._tail > 1e4 && this._tail <= len >>> 2)
      this._shrinkArray();
    return removed;
  };
  Denque.prototype.splice = function splice(index, count) {
    var i = index;
    if (i !== (i | 0)) {
      return;
    }
    var size = this.size();
    if (i < 0)
      i += size;
    if (i > size)
      return;
    if (arguments.length > 2) {
      var k;
      var temp;
      var removed;
      var arg_len = arguments.length;
      var len = this._list.length;
      var arguments_index = 2;
      if (!size || i < size / 2) {
        temp = new Array(i);
        for (k = 0;k < i; k++) {
          temp[k] = this._list[this._head + k & this._capacityMask];
        }
        if (count === 0) {
          removed = [];
          if (i > 0) {
            this._head = this._head + i + len & this._capacityMask;
          }
        } else {
          removed = this.remove(i, count);
          this._head = this._head + i + len & this._capacityMask;
        }
        while (arg_len > arguments_index) {
          this.unshift(arguments[--arg_len]);
        }
        for (k = i;k > 0; k--) {
          this.unshift(temp[k - 1]);
        }
      } else {
        temp = new Array(size - (i + count));
        var leng = temp.length;
        for (k = 0;k < leng; k++) {
          temp[k] = this._list[this._head + i + count + k & this._capacityMask];
        }
        if (count === 0) {
          removed = [];
          if (i != size) {
            this._tail = this._head + i + len & this._capacityMask;
          }
        } else {
          removed = this.remove(i, count);
          this._tail = this._tail - leng + len & this._capacityMask;
        }
        while (arguments_index < arg_len) {
          this.push(arguments[arguments_index++]);
        }
        for (k = 0;k < leng; k++) {
          this.push(temp[k]);
        }
      }
      return removed;
    } else {
      return this.remove(i, count);
    }
  };
  Denque.prototype.clear = function clear() {
    this._list = new Array(this._list.length);
    this._head = 0;
    this._tail = 0;
  };
  Denque.prototype.isEmpty = function isEmpty() {
    return this._head === this._tail;
  };
  Denque.prototype.toArray = function toArray() {
    return this._copyArray(false);
  };
  Denque.prototype._fromArray = function _fromArray(array) {
    var length = array.length;
    var capacity = this._nextPowerOf2(length);
    this._list = new Array(capacity);
    this._capacityMask = capacity - 1;
    this._tail = length;
    for (var i = 0;i < length; i++)
      this._list[i] = array[i];
  };
  Denque.prototype._copyArray = function _copyArray(fullCopy, size) {
    var src = this._list;
    var capacity = src.length;
    var length = this.length;
    size = size | length;
    if (size == length && this._head < this._tail) {
      return this._list.slice(this._head, this._tail);
    }
    var dest = new Array(size);
    var k = 0;
    var i;
    if (fullCopy || this._head > this._tail) {
      for (i = this._head;i < capacity; i++)
        dest[k++] = src[i];
      for (i = 0;i < this._tail; i++)
        dest[k++] = src[i];
    } else {
      for (i = this._head;i < this._tail; i++)
        dest[k++] = src[i];
    }
    return dest;
  };
  Denque.prototype._growArray = function _growArray() {
    if (this._head != 0) {
      var newList = this._copyArray(true, this._list.length << 1);
      this._tail = this._list.length;
      this._head = 0;
      this._list = newList;
    } else {
      this._tail = this._list.length;
      this._list.length <<= 1;
    }
    this._capacityMask = this._capacityMask << 1 | 1;
  };
  Denque.prototype._shrinkArray = function _shrinkArray() {
    this._list.length >>>= 1;
    this._capacityMask >>>= 1;
  };
  Denque.prototype._nextPowerOf2 = function _nextPowerOf2(num) {
    var log2 = Math.log(num) / Math.log(2);
    var nextPow2 = 1 << log2 + 1;
    return Math.max(nextPow2, 4);
  };
  module.exports = Denque;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/cluster/DelayQueue.js
var require_DelayQueue = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var utils_1 = require_utils2();
  var Deque = require_denque();
  var debug = (0, utils_1.Debug)("delayqueue");

  class DelayQueue {
    constructor() {
      this.queues = {};
      this.timeouts = {};
    }
    push(bucket, item, options) {
      const callback = options.callback || process.nextTick;
      if (!this.queues[bucket]) {
        this.queues[bucket] = new Deque;
      }
      const queue = this.queues[bucket];
      queue.push(item);
      if (!this.timeouts[bucket]) {
        this.timeouts[bucket] = setTimeout(() => {
          callback(() => {
            this.timeouts[bucket] = null;
            this.execute(bucket);
          });
        }, options.timeout);
      }
    }
    execute(bucket) {
      const queue = this.queues[bucket];
      if (!queue) {
        return;
      }
      const { length } = queue;
      if (!length) {
        return;
      }
      debug("send %d commands in %s queue", length, bucket);
      this.queues[bucket] = null;
      while (queue.length > 0) {
        queue.shift()();
      }
    }
  }
  exports.default = DelayQueue;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/cluster/ShardedSubscriber.js
var require_ShardedSubscriber = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var util_1 = require_util();
  var utils_1 = require_utils2();
  var Redis_1 = require_Redis();
  var debug = (0, utils_1.Debug)("cluster:subscriberGroup:shardedSubscriber");

  class ShardedSubscriber {
    constructor(emitter, options) {
      this.emitter = emitter;
      this.started = false;
      this.instance = null;
      this.messageListeners = new Map;
      this.onEnd = () => {
        this.started = false;
        this.emitter.emit("-node", this.instance, this.nodeKey);
      };
      this.onError = (error) => {
        this.emitter.emit("nodeError", error, this.nodeKey);
      };
      this.onMoved = () => {
        this.emitter.emit("moved");
      };
      this.instance = new Redis_1.default({
        port: options.port,
        host: options.host,
        username: options.username,
        password: options.password,
        enableReadyCheck: false,
        offlineQueue: true,
        connectionName: (0, util_1.getConnectionName)("ssubscriber", options.connectionName),
        lazyConnect: true,
        tls: options.tls,
        retryStrategy: null
      });
      this.nodeKey = (0, util_1.getNodeKey)(options);
      this.instance.once("end", this.onEnd);
      this.instance.on("error", this.onError);
      this.instance.on("moved", this.onMoved);
      for (const event of ["smessage", "smessageBuffer"]) {
        const listener = (...args) => {
          this.emitter.emit(event, ...args);
        };
        this.messageListeners.set(event, listener);
        this.instance.on(event, listener);
      }
    }
    async start() {
      if (this.started) {
        debug("already started %s", this.nodeKey);
        return;
      }
      try {
        await this.instance.connect();
        debug("started %s", this.nodeKey);
        this.started = true;
      } catch (err) {
        debug("failed to start %s: %s", this.nodeKey, err);
        this.started = false;
        throw err;
      }
    }
    stop() {
      this.started = false;
      if (this.instance) {
        this.instance.disconnect();
        this.instance.removeAllListeners();
        this.messageListeners.clear();
        this.instance = null;
      }
      debug("stopped %s", this.nodeKey);
    }
    isStarted() {
      return this.started;
    }
    getInstance() {
      return this.instance;
    }
    getNodeKey() {
      return this.nodeKey;
    }
  }
  exports.default = ShardedSubscriber;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/cluster/ClusterSubscriberGroup.js
var require_ClusterSubscriberGroup = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var utils_1 = require_utils2();
  var util_1 = require_util();
  var calculateSlot = require_lib();
  var ShardedSubscriber_1 = require_ShardedSubscriber();
  var debug = (0, utils_1.Debug)("cluster:subscriberGroup");

  class ClusterSubscriberGroup {
    constructor(subscriberGroupEmitter) {
      this.subscriberGroupEmitter = subscriberGroupEmitter;
      this.shardedSubscribers = new Map;
      this.clusterSlots = [];
      this.subscriberToSlotsIndex = new Map;
      this.channels = new Map;
      this.failedAttemptsByNode = new Map;
      this.isResetting = false;
      this.pendingReset = null;
      this.handleSubscriberConnectFailed = (error, nodeKey) => {
        const currentAttempts = this.failedAttemptsByNode.get(nodeKey) || 0;
        const failedAttempts = currentAttempts + 1;
        this.failedAttemptsByNode.set(nodeKey, failedAttempts);
        const attempts = Math.min(failedAttempts, ClusterSubscriberGroup.MAX_RETRY_ATTEMPTS);
        const backoff = Math.min(ClusterSubscriberGroup.BASE_BACKOFF_MS * 2 ** attempts, ClusterSubscriberGroup.MAX_BACKOFF_MS);
        const jitter = Math.floor((Math.random() - 0.5) * (backoff * 0.5));
        const delay = Math.max(0, backoff + jitter);
        debug("Failed to connect subscriber for %s. Refreshing slots in %dms", nodeKey, delay);
        this.subscriberGroupEmitter.emit("subscriberConnectFailed", {
          delay,
          error
        });
      };
      this.handleSubscriberConnectSucceeded = (nodeKey) => {
        this.failedAttemptsByNode.delete(nodeKey);
      };
    }
    getResponsibleSubscriber(slot) {
      const nodeKey = this.clusterSlots[slot][0];
      return this.shardedSubscribers.get(nodeKey);
    }
    addChannels(channels) {
      const slot = calculateSlot(channels[0]);
      for (const c of channels) {
        if (calculateSlot(c) !== slot) {
          return -1;
        }
      }
      const currChannels = this.channels.get(slot);
      if (!currChannels) {
        this.channels.set(slot, channels);
      } else {
        this.channels.set(slot, currChannels.concat(channels));
      }
      return Array.from(this.channels.values()).reduce((sum, array) => sum + array.length, 0);
    }
    removeChannels(channels) {
      const slot = calculateSlot(channels[0]);
      for (const c of channels) {
        if (calculateSlot(c) !== slot) {
          return -1;
        }
      }
      const slotChannels = this.channels.get(slot);
      if (slotChannels) {
        const updatedChannels = slotChannels.filter((c) => !channels.includes(c));
        this.channels.set(slot, updatedChannels);
      }
      return Array.from(this.channels.values()).reduce((sum, array) => sum + array.length, 0);
    }
    stop() {
      for (const s of this.shardedSubscribers.values()) {
        s.stop();
      }
      this.pendingReset = null;
      this.shardedSubscribers.clear();
      this.subscriberToSlotsIndex.clear();
    }
    start() {
      const startPromises = [];
      for (const s of this.shardedSubscribers.values()) {
        if (!s.isStarted()) {
          startPromises.push(s.start().then(() => {
            this.handleSubscriberConnectSucceeded(s.getNodeKey());
          }).catch((err) => {
            this.handleSubscriberConnectFailed(err, s.getNodeKey());
          }));
        }
      }
      return Promise.all(startPromises);
    }
    async reset(clusterSlots, clusterNodes) {
      if (this.isResetting) {
        this.pendingReset = { slots: clusterSlots, nodes: clusterNodes };
        return;
      }
      this.isResetting = true;
      try {
        const hasTopologyChanged = this._refreshSlots(clusterSlots);
        const hasFailedSubscribers = this.hasUnhealthySubscribers();
        if (!hasTopologyChanged && !hasFailedSubscribers) {
          debug("No topology change detected or failed subscribers. Skipping reset.");
          return;
        }
        for (const [nodeKey, shardedSubscriber] of this.shardedSubscribers) {
          if (this.subscriberToSlotsIndex.has(nodeKey) && shardedSubscriber.isStarted()) {
            debug("Skipping deleting subscriber for %s", nodeKey);
            continue;
          }
          debug("Removing subscriber for %s", nodeKey);
          shardedSubscriber.stop();
          this.shardedSubscribers.delete(nodeKey);
          this.subscriberGroupEmitter.emit("-subscriber");
        }
        const startPromises = [];
        for (const [nodeKey, _] of this.subscriberToSlotsIndex) {
          if (this.shardedSubscribers.has(nodeKey)) {
            debug("Skipping creating new subscriber for %s", nodeKey);
            continue;
          }
          debug("Creating new subscriber for %s", nodeKey);
          const redis = clusterNodes.find((node) => {
            return (0, util_1.getNodeKey)(node.options) === nodeKey;
          });
          if (!redis) {
            debug("Failed to find node for key %s", nodeKey);
            continue;
          }
          const sub = new ShardedSubscriber_1.default(this.subscriberGroupEmitter, redis.options);
          this.shardedSubscribers.set(nodeKey, sub);
          startPromises.push(sub.start().then(() => {
            this.handleSubscriberConnectSucceeded(nodeKey);
          }).catch((error) => {
            this.handleSubscriberConnectFailed(error, nodeKey);
          }));
          this.subscriberGroupEmitter.emit("+subscriber");
        }
        await Promise.all(startPromises);
        this._resubscribe();
        this.subscriberGroupEmitter.emit("subscribersReady");
      } finally {
        this.isResetting = false;
        if (this.pendingReset) {
          const { slots, nodes } = this.pendingReset;
          this.pendingReset = null;
          await this.reset(slots, nodes);
        }
      }
    }
    _refreshSlots(targetSlots) {
      if (this._slotsAreEqual(targetSlots)) {
        debug("Nothing to refresh because the new cluster map is equal to the previous one.");
        return false;
      }
      debug("Refreshing the slots of the subscriber group.");
      this.subscriberToSlotsIndex = new Map;
      for (let slot = 0;slot < targetSlots.length; slot++) {
        const node = targetSlots[slot][0];
        if (!this.subscriberToSlotsIndex.has(node)) {
          this.subscriberToSlotsIndex.set(node, []);
        }
        this.subscriberToSlotsIndex.get(node).push(Number(slot));
      }
      this.clusterSlots = JSON.parse(JSON.stringify(targetSlots));
      return true;
    }
    _resubscribe() {
      if (this.shardedSubscribers) {
        this.shardedSubscribers.forEach((s, nodeKey) => {
          const subscriberSlots = this.subscriberToSlotsIndex.get(nodeKey);
          if (subscriberSlots) {
            subscriberSlots.forEach((ss) => {
              const redis = s.getInstance();
              const channels = this.channels.get(ss);
              if (channels && channels.length > 0) {
                if (redis.status === "end") {
                  return;
                }
                if (redis.status === "ready") {
                  redis.ssubscribe(...channels).catch((err) => {
                    debug("Failed to ssubscribe on node %s: %s", nodeKey, err);
                  });
                } else {
                  redis.once("ready", () => {
                    redis.ssubscribe(...channels).catch((err) => {
                      debug("Failed to ssubscribe on node %s: %s", nodeKey, err);
                    });
                  });
                }
              }
            });
          }
        });
      }
    }
    _slotsAreEqual(other) {
      if (this.clusterSlots === undefined) {
        return false;
      } else {
        return JSON.stringify(this.clusterSlots) === JSON.stringify(other);
      }
    }
    hasUnhealthySubscribers() {
      const hasFailedSubscribers = Array.from(this.shardedSubscribers.values()).some((sub) => !sub.isStarted());
      const hasMissingSubscribers = Array.from(this.subscriberToSlotsIndex.keys()).some((nodeKey) => !this.shardedSubscribers.has(nodeKey));
      return hasFailedSubscribers || hasMissingSubscribers;
    }
  }
  exports.default = ClusterSubscriberGroup;
  ClusterSubscriberGroup.MAX_RETRY_ATTEMPTS = 10;
  ClusterSubscriberGroup.MAX_BACKOFF_MS = 2000;
  ClusterSubscriberGroup.BASE_BACKOFF_MS = 100;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/cluster/index.js
var require_cluster = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var commands_1 = require_built();
  var events_1 = __require("events");
  var redis_errors_1 = require_redis_errors();
  var standard_as_callback_1 = require_built2();
  var Command_1 = require_Command();
  var ClusterAllFailedError_1 = require_ClusterAllFailedError();
  var Redis_1 = require_Redis();
  var ScanStream_1 = require_ScanStream();
  var transaction_1 = require_transaction();
  var utils_1 = require_utils2();
  var applyMixin_1 = require_applyMixin();
  var Commander_1 = require_Commander();
  var ClusterOptions_1 = require_ClusterOptions();
  var ClusterSubscriber_1 = require_ClusterSubscriber();
  var ConnectionPool_1 = require_ConnectionPool();
  var DelayQueue_1 = require_DelayQueue();
  var util_1 = require_util();
  var Deque = require_denque();
  var ClusterSubscriberGroup_1 = require_ClusterSubscriberGroup();
  var debug = (0, utils_1.Debug)("cluster");
  var REJECT_OVERWRITTEN_COMMANDS = new WeakSet;

  class Cluster extends Commander_1.default {
    constructor(startupNodes, options = {}) {
      super();
      this.slots = [];
      this._groupsIds = {};
      this._groupsBySlot = Array(16384);
      this.isCluster = true;
      this.retryAttempts = 0;
      this.delayQueue = new DelayQueue_1.default;
      this.offlineQueue = new Deque;
      this.isRefreshing = false;
      this._refreshSlotsCacheCallbacks = [];
      this._autoPipelines = new Map;
      this._runningAutoPipelines = new Set;
      this._readyDelayedCallbacks = [];
      this.connectionEpoch = 0;
      events_1.EventEmitter.call(this);
      this.startupNodes = startupNodes;
      this.options = (0, utils_1.defaults)({}, options, ClusterOptions_1.DEFAULT_CLUSTER_OPTIONS, this.options);
      if (this.options.shardedSubscribers) {
        this.createShardedSubscriberGroup();
      }
      if (this.options.redisOptions && this.options.redisOptions.keyPrefix && !this.options.keyPrefix) {
        this.options.keyPrefix = this.options.redisOptions.keyPrefix;
      }
      if (typeof this.options.scaleReads !== "function" && ["all", "master", "slave"].indexOf(this.options.scaleReads) === -1) {
        throw new Error('Invalid option scaleReads "' + this.options.scaleReads + '". Expected "all", "master", "slave" or a custom function');
      }
      this.connectionPool = new ConnectionPool_1.default(this.options.redisOptions);
      this.connectionPool.on("-node", (redis, key) => {
        this.emit("-node", redis);
      });
      this.connectionPool.on("+node", (redis) => {
        this.emit("+node", redis);
      });
      this.connectionPool.on("drain", () => {
        this.setStatus("close");
      });
      this.connectionPool.on("nodeError", (error, key) => {
        this.emit("node error", error, key);
      });
      this.subscriber = new ClusterSubscriber_1.default(this.connectionPool, this);
      if (this.options.scripts) {
        Object.entries(this.options.scripts).forEach(([name, definition]) => {
          this.defineCommand(name, definition);
        });
      }
      if (this.options.lazyConnect) {
        this.setStatus("wait");
      } else {
        this.connect().catch((err) => {
          debug("connecting failed: %s", err);
        });
      }
    }
    connect() {
      return new Promise((resolve, reject) => {
        if (this.status === "connecting" || this.status === "connect" || this.status === "ready") {
          reject(new Error("Redis is already connecting/connected"));
          return;
        }
        const epoch = ++this.connectionEpoch;
        this.setStatus("connecting");
        this.resolveStartupNodeHostnames().then((nodes) => {
          if (this.connectionEpoch !== epoch) {
            debug("discard connecting after resolving startup nodes because epoch not match: %d != %d", epoch, this.connectionEpoch);
            reject(new redis_errors_1.RedisError("Connection is discarded because a new connection is made"));
            return;
          }
          if (this.status !== "connecting") {
            debug("discard connecting after resolving startup nodes because the status changed to %s", this.status);
            reject(new redis_errors_1.RedisError("Connection is aborted"));
            return;
          }
          this.connectionPool.reset(nodes);
          if (this.options.shardedSubscribers) {
            this.shardedSubscribers.reset(this.slots, this.connectionPool.getNodes("all")).catch((err) => {
              debug("Error while starting subscribers: %s", err);
            });
          }
          const readyHandler = () => {
            this.setStatus("ready");
            this.retryAttempts = 0;
            this.executeOfflineCommands();
            this.resetNodesRefreshInterval();
            resolve();
          };
          let closeListener = undefined;
          const refreshListener = () => {
            this.invokeReadyDelayedCallbacks(undefined);
            this.removeListener("close", closeListener);
            this.manuallyClosing = false;
            this.setStatus("connect");
            if (this.options.enableReadyCheck) {
              this.readyCheck((err, fail) => {
                if (err || fail) {
                  debug("Ready check failed (%s). Reconnecting...", err || fail);
                  if (this.status === "connect") {
                    this.disconnect(true);
                  }
                } else {
                  readyHandler();
                }
              });
            } else {
              readyHandler();
            }
          };
          closeListener = () => {
            const error = new Error("None of startup nodes is available");
            this.removeListener("refresh", refreshListener);
            this.invokeReadyDelayedCallbacks(error);
            reject(error);
          };
          this.once("refresh", refreshListener);
          this.once("close", closeListener);
          this.once("close", this.handleCloseEvent.bind(this));
          this.refreshSlotsCache((err) => {
            if (err && err.message === ClusterAllFailedError_1.default.defaultMessage) {
              Redis_1.default.prototype.silentEmit.call(this, "error", err);
              this.connectionPool.reset([]);
            }
          });
          this.subscriber.start();
          if (this.options.shardedSubscribers) {
            this.shardedSubscribers.start().catch((err) => {
              debug("Error while starting subscribers: %s", err);
            });
          }
        }).catch((err) => {
          this.setStatus("close");
          this.handleCloseEvent(err);
          this.invokeReadyDelayedCallbacks(err);
          reject(err);
        });
      });
    }
    disconnect(reconnect = false) {
      const status = this.status;
      this.setStatus("disconnecting");
      if (!reconnect) {
        this.manuallyClosing = true;
      }
      if (this.reconnectTimeout && !reconnect) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
        debug("Canceled reconnecting attempts");
      }
      this.clearNodesRefreshInterval();
      this.subscriber.stop();
      if (this.options.shardedSubscribers) {
        this.shardedSubscribers.stop();
      }
      if (status === "wait") {
        this.setStatus("close");
        this.handleCloseEvent();
      } else {
        this.connectionPool.reset([]);
      }
    }
    quit(callback) {
      const status = this.status;
      this.setStatus("disconnecting");
      this.manuallyClosing = true;
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      this.clearNodesRefreshInterval();
      this.subscriber.stop();
      if (this.options.shardedSubscribers) {
        this.shardedSubscribers.stop();
      }
      if (status === "wait") {
        const ret = (0, standard_as_callback_1.default)(Promise.resolve("OK"), callback);
        setImmediate(function() {
          this.setStatus("close");
          this.handleCloseEvent();
        }.bind(this));
        return ret;
      }
      return (0, standard_as_callback_1.default)(Promise.all(this.nodes().map((node) => node.quit().catch((err) => {
        if (err.message === utils_1.CONNECTION_CLOSED_ERROR_MSG) {
          return "OK";
        }
        throw err;
      }))).then(() => "OK"), callback);
    }
    duplicate(overrideStartupNodes = [], overrideOptions = {}) {
      const startupNodes = overrideStartupNodes.length > 0 ? overrideStartupNodes : this.startupNodes.slice(0);
      const options = Object.assign({}, this.options, overrideOptions);
      return new Cluster(startupNodes, options);
    }
    nodes(role = "all") {
      if (role !== "all" && role !== "master" && role !== "slave") {
        throw new Error('Invalid role "' + role + '". Expected "all", "master" or "slave"');
      }
      return this.connectionPool.getNodes(role);
    }
    delayUntilReady(callback) {
      this._readyDelayedCallbacks.push(callback);
    }
    get autoPipelineQueueSize() {
      let queued = 0;
      for (const pipeline of this._autoPipelines.values()) {
        queued += pipeline.length;
      }
      return queued;
    }
    refreshSlotsCache(callback) {
      if (callback) {
        this._refreshSlotsCacheCallbacks.push(callback);
      }
      if (this.isRefreshing) {
        return;
      }
      this.isRefreshing = true;
      const _this = this;
      const wrapper = (error) => {
        this.isRefreshing = false;
        for (const callback2 of this._refreshSlotsCacheCallbacks) {
          callback2(error);
        }
        this._refreshSlotsCacheCallbacks = [];
      };
      const nodes = (0, utils_1.shuffle)(this.connectionPool.getNodes());
      let lastNodeError = null;
      function tryNode(index) {
        if (index === nodes.length) {
          const error = new ClusterAllFailedError_1.default(ClusterAllFailedError_1.default.defaultMessage, lastNodeError);
          return wrapper(error);
        }
        const node = nodes[index];
        const key = `${node.options.host}:${node.options.port}`;
        debug("getting slot cache from %s", key);
        _this.getInfoFromNode(node, function(err) {
          switch (_this.status) {
            case "close":
            case "end":
              return wrapper(new Error("Cluster is disconnected."));
            case "disconnecting":
              return wrapper(new Error("Cluster is disconnecting."));
          }
          if (err) {
            _this.emit("node error", err, key);
            lastNodeError = err;
            tryNode(index + 1);
          } else {
            _this.emit("refresh");
            wrapper();
          }
        });
      }
      tryNode(0);
    }
    sendCommand(command, stream, node) {
      if (this.status === "wait") {
        this.connect().catch(utils_1.noop);
      }
      if (this.status === "end") {
        command.reject(new Error(utils_1.CONNECTION_CLOSED_ERROR_MSG));
        return command.promise;
      }
      let to = this.options.scaleReads;
      if (to !== "master") {
        const isCommandReadOnly = command.isReadOnly || (0, commands_1.exists)(command.name) && (0, commands_1.hasFlag)(command.name, "readonly");
        if (!isCommandReadOnly) {
          to = "master";
        }
      }
      let targetSlot = node ? node.slot : command.getSlot();
      const ttl = {};
      const _this = this;
      if (!node && !REJECT_OVERWRITTEN_COMMANDS.has(command)) {
        REJECT_OVERWRITTEN_COMMANDS.add(command);
        const reject = command.reject;
        command.reject = function(err) {
          const partialTry = tryConnection.bind(null, true);
          _this.handleError(err, ttl, {
            moved: function(slot, key) {
              debug("command %s is moved to %s", command.name, key);
              targetSlot = Number(slot);
              if (_this.slots[slot]) {
                _this.slots[slot][0] = key;
              } else {
                _this.slots[slot] = [key];
              }
              _this._groupsBySlot[slot] = _this._groupsIds[_this.slots[slot].join(";")];
              _this.connectionPool.findOrCreate(_this.natMapper(key));
              tryConnection();
              debug("refreshing slot caches... (triggered by MOVED error)");
              _this.refreshSlotsCache();
            },
            ask: function(slot, key) {
              debug("command %s is required to ask %s:%s", command.name, key);
              const mapped = _this.natMapper(key);
              _this.connectionPool.findOrCreate(mapped);
              tryConnection(false, `${mapped.host}:${mapped.port}`);
            },
            tryagain: partialTry,
            clusterDown: partialTry,
            connectionClosed: partialTry,
            maxRedirections: function(redirectionError) {
              reject.call(command, redirectionError);
            },
            defaults: function() {
              reject.call(command, err);
            }
          });
        };
      }
      tryConnection();
      function tryConnection(random, asking) {
        if (_this.status === "end") {
          command.reject(new redis_errors_1.AbortError("Cluster is ended."));
          return;
        }
        let redis;
        if (_this.status === "ready" || command.name === "cluster") {
          if (node && node.redis) {
            redis = node.redis;
          } else if (Command_1.default.checkFlag("ENTER_SUBSCRIBER_MODE", command.name) || Command_1.default.checkFlag("EXIT_SUBSCRIBER_MODE", command.name)) {
            if (_this.options.shardedSubscribers && (command.name == "ssubscribe" || command.name == "sunsubscribe")) {
              const sub = _this.shardedSubscribers.getResponsibleSubscriber(targetSlot);
              if (!sub) {
                command.reject(new redis_errors_1.AbortError(`No sharded subscriber for slot: ${targetSlot}`));
                return;
              }
              let status = -1;
              if (command.name == "ssubscribe") {
                status = _this.shardedSubscribers.addChannels(command.getKeys());
              }
              if (command.name == "sunsubscribe") {
                status = _this.shardedSubscribers.removeChannels(command.getKeys());
              }
              if (status !== -1) {
                redis = sub.getInstance();
              } else {
                command.reject(new redis_errors_1.AbortError("Possible CROSSSLOT error: All channels must hash to the same slot"));
              }
            } else {
              redis = _this.subscriber.getInstance();
            }
            if (!redis) {
              command.reject(new redis_errors_1.AbortError("No subscriber for the cluster"));
              return;
            }
          } else {
            if (!random) {
              if (typeof targetSlot === "number" && _this.slots[targetSlot]) {
                const nodeKeys = _this.slots[targetSlot];
                if (typeof to === "function") {
                  const nodes = nodeKeys.map(function(key) {
                    return _this.connectionPool.getInstanceByKey(key);
                  });
                  redis = to(nodes, command);
                  if (Array.isArray(redis)) {
                    redis = (0, utils_1.sample)(redis);
                  }
                  if (!redis) {
                    redis = nodes[0];
                  }
                } else {
                  let key;
                  if (to === "all") {
                    key = (0, utils_1.sample)(nodeKeys);
                  } else if (to === "slave" && nodeKeys.length > 1) {
                    key = (0, utils_1.sample)(nodeKeys, 1);
                  } else {
                    key = nodeKeys[0];
                  }
                  redis = _this.connectionPool.getInstanceByKey(key);
                }
              }
              if (asking) {
                redis = _this.connectionPool.getInstanceByKey(asking);
                redis.asking();
              }
            }
            if (!redis) {
              redis = (typeof to === "function" ? null : _this.connectionPool.getSampleInstance(to)) || _this.connectionPool.getSampleInstance("all");
            }
          }
          if (node && !node.redis) {
            node.redis = redis;
          }
        }
        if (redis) {
          redis.sendCommand(command, stream);
        } else if (_this.options.enableOfflineQueue) {
          _this.offlineQueue.push({
            command,
            stream,
            node
          });
        } else {
          command.reject(new Error("Cluster isn't ready and enableOfflineQueue options is false"));
        }
      }
      return command.promise;
    }
    sscanStream(key, options) {
      return this.createScanStream("sscan", { key, options });
    }
    sscanBufferStream(key, options) {
      return this.createScanStream("sscanBuffer", { key, options });
    }
    hscanStream(key, options) {
      return this.createScanStream("hscan", { key, options });
    }
    hscanBufferStream(key, options) {
      return this.createScanStream("hscanBuffer", { key, options });
    }
    zscanStream(key, options) {
      return this.createScanStream("zscan", { key, options });
    }
    zscanBufferStream(key, options) {
      return this.createScanStream("zscanBuffer", { key, options });
    }
    handleError(error, ttl, handlers) {
      if (typeof ttl.value === "undefined") {
        ttl.value = this.options.maxRedirections;
      } else {
        ttl.value -= 1;
      }
      if (ttl.value <= 0) {
        handlers.maxRedirections(new Error("Too many Cluster redirections. Last error: " + error));
        return;
      }
      const errv = error.message.split(" ");
      if (errv[0] === "MOVED") {
        const timeout = this.options.retryDelayOnMoved;
        if (timeout && typeof timeout === "number") {
          this.delayQueue.push("moved", handlers.moved.bind(null, errv[1], errv[2]), { timeout });
        } else {
          handlers.moved(errv[1], errv[2]);
        }
      } else if (errv[0] === "ASK") {
        handlers.ask(errv[1], errv[2]);
      } else if (errv[0] === "TRYAGAIN") {
        this.delayQueue.push("tryagain", handlers.tryagain, {
          timeout: this.options.retryDelayOnTryAgain
        });
      } else if (errv[0] === "CLUSTERDOWN" && this.options.retryDelayOnClusterDown > 0) {
        this.delayQueue.push("clusterdown", handlers.connectionClosed, {
          timeout: this.options.retryDelayOnClusterDown,
          callback: this.refreshSlotsCache.bind(this)
        });
      } else if (error.message === utils_1.CONNECTION_CLOSED_ERROR_MSG && this.options.retryDelayOnFailover > 0 && this.status === "ready") {
        this.delayQueue.push("failover", handlers.connectionClosed, {
          timeout: this.options.retryDelayOnFailover,
          callback: this.refreshSlotsCache.bind(this)
        });
      } else {
        handlers.defaults();
      }
    }
    resetOfflineQueue() {
      this.offlineQueue = new Deque;
    }
    clearNodesRefreshInterval() {
      if (this.slotsTimer) {
        clearTimeout(this.slotsTimer);
        this.slotsTimer = null;
      }
    }
    resetNodesRefreshInterval() {
      if (this.slotsTimer || !this.options.slotsRefreshInterval) {
        return;
      }
      const nextRound = () => {
        this.slotsTimer = setTimeout(() => {
          debug('refreshing slot caches... (triggered by "slotsRefreshInterval" option)');
          this.refreshSlotsCache(() => {
            nextRound();
          });
        }, this.options.slotsRefreshInterval);
      };
      nextRound();
    }
    setStatus(status) {
      debug("status: %s -> %s", this.status || "[empty]", status);
      this.status = status;
      process.nextTick(() => {
        this.emit(status);
      });
    }
    handleCloseEvent(reason) {
      var _a;
      if (reason) {
        debug("closed because %s", reason);
      }
      let retryDelay;
      if (!this.manuallyClosing && typeof this.options.clusterRetryStrategy === "function") {
        retryDelay = this.options.clusterRetryStrategy.call(this, ++this.retryAttempts, reason);
      }
      if (typeof retryDelay === "number") {
        this.setStatus("reconnecting");
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectTimeout = null;
          debug("Cluster is disconnected. Retrying after %dms", retryDelay);
          this.connect().catch(function(err) {
            debug("Got error %s when reconnecting. Ignoring...", err);
          });
        }, retryDelay);
      } else {
        if (this.options.shardedSubscribers) {
          (_a = this.subscriberGroupEmitter) === null || _a === undefined || _a.removeAllListeners();
        }
        this.setStatus("end");
        this.flushQueue(new Error("None of startup nodes is available"));
      }
    }
    flushQueue(error) {
      let item;
      while (item = this.offlineQueue.shift()) {
        item.command.reject(error);
      }
    }
    executeOfflineCommands() {
      if (this.offlineQueue.length) {
        debug("send %d commands in offline queue", this.offlineQueue.length);
        const offlineQueue = this.offlineQueue;
        this.resetOfflineQueue();
        let item;
        while (item = offlineQueue.shift()) {
          this.sendCommand(item.command, item.stream, item.node);
        }
      }
    }
    natMapper(nodeKey) {
      const key = typeof nodeKey === "string" ? nodeKey : `${nodeKey.host}:${nodeKey.port}`;
      let mapped = null;
      if (this.options.natMap && typeof this.options.natMap === "function") {
        mapped = this.options.natMap(key);
      } else if (this.options.natMap && typeof this.options.natMap === "object") {
        mapped = this.options.natMap[key];
      }
      if (mapped) {
        debug("NAT mapping %s -> %O", key, mapped);
        return Object.assign({}, mapped);
      }
      return typeof nodeKey === "string" ? (0, util_1.nodeKeyToRedisOptions)(nodeKey) : nodeKey;
    }
    getInfoFromNode(redis, callback) {
      if (!redis) {
        return callback(new Error("Node is disconnected"));
      }
      const duplicatedConnection = redis.duplicate({
        enableOfflineQueue: true,
        enableReadyCheck: false,
        retryStrategy: null,
        connectionName: (0, util_1.getConnectionName)("refresher", this.options.redisOptions && this.options.redisOptions.connectionName)
      });
      duplicatedConnection.on("error", utils_1.noop);
      duplicatedConnection.cluster("SLOTS", (0, utils_1.timeout)((err, result) => {
        duplicatedConnection.disconnect();
        if (err) {
          debug("error encountered running CLUSTER.SLOTS: %s", err);
          return callback(err);
        }
        if (this.status === "disconnecting" || this.status === "close" || this.status === "end") {
          debug("ignore CLUSTER.SLOTS results (count: %d) since cluster status is %s", result.length, this.status);
          callback();
          return;
        }
        const nodes = [];
        debug("cluster slots result count: %d", result.length);
        for (let i = 0;i < result.length; ++i) {
          const items = result[i];
          const slotRangeStart = items[0];
          const slotRangeEnd = items[1];
          const keys = [];
          for (let j2 = 2;j2 < items.length; j2++) {
            if (!items[j2][0]) {
              continue;
            }
            const node = this.natMapper({
              host: items[j2][0],
              port: items[j2][1]
            });
            node.readOnly = j2 !== 2;
            nodes.push(node);
            keys.push(node.host + ":" + node.port);
          }
          debug("cluster slots result [%d]: slots %d~%d served by %s", i, slotRangeStart, slotRangeEnd, keys);
          for (let slot = slotRangeStart;slot <= slotRangeEnd; slot++) {
            this.slots[slot] = keys;
          }
        }
        this._groupsIds = Object.create(null);
        let j = 0;
        for (let i = 0;i < 16384; i++) {
          const target = (this.slots[i] || []).join(";");
          if (!target.length) {
            this._groupsBySlot[i] = undefined;
            continue;
          }
          if (!this._groupsIds[target]) {
            this._groupsIds[target] = ++j;
          }
          this._groupsBySlot[i] = this._groupsIds[target];
        }
        this.connectionPool.reset(nodes);
        if (this.options.shardedSubscribers) {
          this.shardedSubscribers.reset(this.slots, this.connectionPool.getNodes("all")).catch((err2) => {
            debug("Error while starting subscribers: %s", err2);
          });
        }
        callback();
      }, this.options.slotsRefreshTimeout));
    }
    invokeReadyDelayedCallbacks(err) {
      for (const c of this._readyDelayedCallbacks) {
        process.nextTick(c, err);
      }
      this._readyDelayedCallbacks = [];
    }
    readyCheck(callback) {
      this.cluster("INFO", (err, res) => {
        if (err) {
          return callback(err);
        }
        if (typeof res !== "string") {
          return callback();
        }
        let state;
        const lines = res.split(`\r
`);
        for (let i = 0;i < lines.length; ++i) {
          const parts = lines[i].split(":");
          if (parts[0] === "cluster_state") {
            state = parts[1];
            break;
          }
        }
        if (state === "fail") {
          debug("cluster state not ok (%s)", state);
          callback(null, state);
        } else {
          callback();
        }
      });
    }
    resolveSrv(hostname) {
      return new Promise((resolve, reject) => {
        this.options.resolveSrv(hostname, (err, records) => {
          if (err) {
            return reject(err);
          }
          const self = this, groupedRecords = (0, util_1.groupSrvRecords)(records), sortedKeys = Object.keys(groupedRecords).sort((a, b) => parseInt(a) - parseInt(b));
          function tryFirstOne(err2) {
            if (!sortedKeys.length) {
              return reject(err2);
            }
            const key = sortedKeys[0], group = groupedRecords[key], record = (0, util_1.weightSrvRecords)(group);
            if (!group.records.length) {
              sortedKeys.shift();
            }
            self.dnsLookup(record.name).then((host) => resolve({
              host,
              port: record.port
            }), tryFirstOne);
          }
          tryFirstOne();
        });
      });
    }
    dnsLookup(hostname) {
      return new Promise((resolve, reject) => {
        this.options.dnsLookup(hostname, (err, address) => {
          if (err) {
            debug("failed to resolve hostname %s to IP: %s", hostname, err.message);
            reject(err);
          } else {
            debug("resolved hostname %s to IP %s", hostname, address);
            resolve(address);
          }
        });
      });
    }
    async resolveStartupNodeHostnames() {
      if (!Array.isArray(this.startupNodes) || this.startupNodes.length === 0) {
        throw new Error("`startupNodes` should contain at least one node.");
      }
      const startupNodes = (0, util_1.normalizeNodeOptions)(this.startupNodes);
      const hostnames = (0, util_1.getUniqueHostnamesFromOptions)(startupNodes);
      if (hostnames.length === 0) {
        return startupNodes;
      }
      const configs = await Promise.all(hostnames.map((this.options.useSRVRecords ? this.resolveSrv : this.dnsLookup).bind(this)));
      const hostnameToConfig = (0, utils_1.zipMap)(hostnames, configs);
      return startupNodes.map((node) => {
        const config = hostnameToConfig.get(node.host);
        if (!config) {
          return node;
        }
        if (this.options.useSRVRecords) {
          return Object.assign({}, node, config);
        }
        return Object.assign({}, node, { host: config });
      });
    }
    createScanStream(command, { key, options = {} }) {
      return new ScanStream_1.default({
        objectMode: true,
        key,
        redis: this,
        command,
        ...options
      });
    }
    createShardedSubscriberGroup() {
      this.subscriberGroupEmitter = new events_1.EventEmitter;
      this.shardedSubscribers = new ClusterSubscriberGroup_1.default(this.subscriberGroupEmitter);
      const refreshSlotsCacheCallback = (err) => {
        if (err instanceof ClusterAllFailedError_1.default) {
          this.disconnect(true);
        }
      };
      this.subscriberGroupEmitter.on("-node", (redis, nodeKey) => {
        this.emit("-node", redis, nodeKey);
        this.refreshSlotsCache(refreshSlotsCacheCallback);
      });
      this.subscriberGroupEmitter.on("subscriberConnectFailed", ({ delay, error }) => {
        this.emit("error", error);
        setTimeout(() => {
          this.refreshSlotsCache(refreshSlotsCacheCallback);
        }, delay);
      });
      this.subscriberGroupEmitter.on("moved", () => {
        this.refreshSlotsCache(refreshSlotsCacheCallback);
      });
      this.subscriberGroupEmitter.on("-subscriber", () => {
        this.emit("-subscriber");
      });
      this.subscriberGroupEmitter.on("+subscriber", () => {
        this.emit("+subscriber");
      });
      this.subscriberGroupEmitter.on("nodeError", (error, nodeKey) => {
        this.emit("nodeError", error, nodeKey);
      });
      this.subscriberGroupEmitter.on("subscribersReady", () => {
        this.emit("subscribersReady");
      });
      for (const event of ["smessage", "smessageBuffer"]) {
        this.subscriberGroupEmitter.on(event, (arg1, arg2, arg3) => {
          this.emit(event, arg1, arg2, arg3);
        });
      }
    }
  }
  (0, applyMixin_1.default)(Cluster, events_1.EventEmitter);
  (0, transaction_1.addTransactionSupport)(Cluster.prototype);
  exports.default = Cluster;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/connectors/AbstractConnector.js
var require_AbstractConnector = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var utils_1 = require_utils2();
  var debug = (0, utils_1.Debug)("AbstractConnector");

  class AbstractConnector {
    constructor(disconnectTimeout) {
      this.connecting = false;
      this.disconnectTimeout = disconnectTimeout;
    }
    check(info) {
      return true;
    }
    disconnect() {
      this.connecting = false;
      if (this.stream) {
        const stream = this.stream;
        const timeout = setTimeout(() => {
          debug("stream %s:%s still open, destroying it", stream.remoteAddress, stream.remotePort);
          stream.destroy();
        }, this.disconnectTimeout);
        stream.on("close", () => clearTimeout(timeout));
        stream.end();
      }
    }
  }
  exports.default = AbstractConnector;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/connectors/StandaloneConnector.js
var require_StandaloneConnector = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var net_1 = __require("net");
  var tls_1 = __require("tls");
  var utils_1 = require_utils2();
  var AbstractConnector_1 = require_AbstractConnector();

  class StandaloneConnector extends AbstractConnector_1.default {
    constructor(options) {
      super(options.disconnectTimeout);
      this.options = options;
    }
    connect(_) {
      const { options } = this;
      this.connecting = true;
      let connectionOptions;
      if ("path" in options && options.path) {
        connectionOptions = {
          path: options.path
        };
      } else {
        connectionOptions = {};
        if ("port" in options && options.port != null) {
          connectionOptions.port = options.port;
        }
        if ("host" in options && options.host != null) {
          connectionOptions.host = options.host;
        }
        if ("family" in options && options.family != null) {
          connectionOptions.family = options.family;
        }
      }
      if (options.tls) {
        Object.assign(connectionOptions, options.tls);
      }
      return new Promise((resolve, reject) => {
        process.nextTick(() => {
          if (!this.connecting) {
            reject(new Error(utils_1.CONNECTION_CLOSED_ERROR_MSG));
            return;
          }
          try {
            if (options.tls) {
              this.stream = (0, tls_1.connect)(connectionOptions);
            } else {
              this.stream = (0, net_1.createConnection)(connectionOptions);
            }
          } catch (err) {
            reject(err);
            return;
          }
          this.stream.once("error", (err) => {
            this.firstError = err;
          });
          resolve(this.stream);
        });
      });
    }
  }
  exports.default = StandaloneConnector;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/connectors/SentinelConnector/SentinelIterator.js
var require_SentinelIterator = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  function isSentinelEql(a, b) {
    return (a.host || "127.0.0.1") === (b.host || "127.0.0.1") && (a.port || 26379) === (b.port || 26379);
  }

  class SentinelIterator {
    constructor(sentinels) {
      this.cursor = 0;
      this.sentinels = sentinels.slice(0);
    }
    next() {
      const done = this.cursor >= this.sentinels.length;
      return { done, value: done ? undefined : this.sentinels[this.cursor++] };
    }
    reset(moveCurrentEndpointToFirst) {
      if (moveCurrentEndpointToFirst && this.sentinels.length > 1 && this.cursor !== 1) {
        this.sentinels.unshift(...this.sentinels.splice(this.cursor - 1));
      }
      this.cursor = 0;
    }
    add(sentinel) {
      for (let i = 0;i < this.sentinels.length; i++) {
        if (isSentinelEql(sentinel, this.sentinels[i])) {
          return false;
        }
      }
      this.sentinels.push(sentinel);
      return true;
    }
    toString() {
      return `${JSON.stringify(this.sentinels)} @${this.cursor}`;
    }
  }
  exports.default = SentinelIterator;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/connectors/SentinelConnector/FailoverDetector.js
var require_FailoverDetector = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.FailoverDetector = undefined;
  var utils_1 = require_utils2();
  var debug = (0, utils_1.Debug)("FailoverDetector");
  var CHANNEL_NAME = "+switch-master";

  class FailoverDetector {
    constructor(connector, sentinels) {
      this.isDisconnected = false;
      this.connector = connector;
      this.sentinels = sentinels;
    }
    cleanup() {
      this.isDisconnected = true;
      for (const sentinel of this.sentinels) {
        sentinel.client.disconnect();
      }
    }
    async subscribe() {
      debug("Starting FailoverDetector");
      const promises = [];
      for (const sentinel of this.sentinels) {
        const promise = sentinel.client.subscribe(CHANNEL_NAME).catch((err) => {
          debug("Failed to subscribe to failover messages on sentinel %s:%s (%s)", sentinel.address.host || "127.0.0.1", sentinel.address.port || 26739, err.message);
        });
        promises.push(promise);
        sentinel.client.on("message", (channel) => {
          if (!this.isDisconnected && channel === CHANNEL_NAME) {
            this.disconnect();
          }
        });
      }
      await Promise.all(promises);
    }
    disconnect() {
      this.isDisconnected = true;
      debug("Failover detected, disconnecting");
      this.connector.disconnect();
    }
  }
  exports.FailoverDetector = FailoverDetector;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/connectors/SentinelConnector/index.js
var require_SentinelConnector = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.SentinelIterator = undefined;
  var net_1 = __require("net");
  var utils_1 = require_utils2();
  var tls_1 = __require("tls");
  var SentinelIterator_1 = require_SentinelIterator();
  exports.SentinelIterator = SentinelIterator_1.default;
  var AbstractConnector_1 = require_AbstractConnector();
  var Redis_1 = require_Redis();
  var FailoverDetector_1 = require_FailoverDetector();
  var debug = (0, utils_1.Debug)("SentinelConnector");

  class SentinelConnector extends AbstractConnector_1.default {
    constructor(options) {
      super(options.disconnectTimeout);
      this.options = options;
      this.emitter = null;
      this.failoverDetector = null;
      if (!this.options.sentinels.length) {
        throw new Error("Requires at least one sentinel to connect to.");
      }
      if (!this.options.name) {
        throw new Error("Requires the name of master.");
      }
      this.sentinelIterator = new SentinelIterator_1.default(this.options.sentinels);
    }
    check(info) {
      const roleMatches = !info.role || this.options.role === info.role;
      if (!roleMatches) {
        debug("role invalid, expected %s, but got %s", this.options.role, info.role);
        this.sentinelIterator.next();
        this.sentinelIterator.next();
        this.sentinelIterator.reset(true);
      }
      return roleMatches;
    }
    disconnect() {
      super.disconnect();
      if (this.failoverDetector) {
        this.failoverDetector.cleanup();
      }
    }
    connect(eventEmitter) {
      this.connecting = true;
      this.retryAttempts = 0;
      let lastError;
      const connectToNext = async () => {
        const endpoint = this.sentinelIterator.next();
        if (endpoint.done) {
          this.sentinelIterator.reset(false);
          const retryDelay = typeof this.options.sentinelRetryStrategy === "function" ? this.options.sentinelRetryStrategy(++this.retryAttempts) : null;
          let errorMsg = typeof retryDelay !== "number" ? "All sentinels are unreachable and retry is disabled." : `All sentinels are unreachable. Retrying from scratch after ${retryDelay}ms.`;
          if (lastError) {
            errorMsg += ` Last error: ${lastError.message}`;
          }
          debug(errorMsg);
          const error = new Error(errorMsg);
          if (typeof retryDelay === "number") {
            eventEmitter("error", error);
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            return connectToNext();
          } else {
            throw error;
          }
        }
        let resolved = null;
        let err = null;
        try {
          resolved = await this.resolve(endpoint.value);
        } catch (error) {
          err = error;
        }
        if (!this.connecting) {
          throw new Error(utils_1.CONNECTION_CLOSED_ERROR_MSG);
        }
        const endpointAddress = endpoint.value.host + ":" + endpoint.value.port;
        if (resolved) {
          debug("resolved: %s:%s from sentinel %s", resolved.host, resolved.port, endpointAddress);
          if (this.options.enableTLSForSentinelMode && this.options.tls) {
            Object.assign(resolved, this.options.tls);
            this.stream = (0, tls_1.connect)(resolved);
            this.stream.once("secureConnect", this.initFailoverDetector.bind(this));
          } else {
            this.stream = (0, net_1.createConnection)(resolved);
            this.stream.once("connect", this.initFailoverDetector.bind(this));
          }
          this.stream.once("error", (err2) => {
            this.firstError = err2;
          });
          return this.stream;
        } else {
          const errorMsg = err ? "failed to connect to sentinel " + endpointAddress + " because " + err.message : "connected to sentinel " + endpointAddress + " successfully, but got an invalid reply: " + resolved;
          debug(errorMsg);
          eventEmitter("sentinelError", new Error(errorMsg));
          if (err) {
            lastError = err;
          }
          return connectToNext();
        }
      };
      return connectToNext();
    }
    async updateSentinels(client) {
      if (!this.options.updateSentinels) {
        return;
      }
      const result = await client.sentinel("sentinels", this.options.name);
      if (!Array.isArray(result)) {
        return;
      }
      result.map(utils_1.packObject).forEach((sentinel) => {
        const flags = sentinel.flags ? sentinel.flags.split(",") : [];
        if (flags.indexOf("disconnected") === -1 && sentinel.ip && sentinel.port) {
          const endpoint = this.sentinelNatResolve(addressResponseToAddress(sentinel));
          if (this.sentinelIterator.add(endpoint)) {
            debug("adding sentinel %s:%s", endpoint.host, endpoint.port);
          }
        }
      });
      debug("Updated internal sentinels: %s", this.sentinelIterator);
    }
    async resolveMaster(client) {
      const result = await client.sentinel("get-master-addr-by-name", this.options.name);
      await this.updateSentinels(client);
      return this.sentinelNatResolve(Array.isArray(result) ? { host: result[0], port: Number(result[1]) } : null);
    }
    async resolveSlave(client) {
      const result = await client.sentinel("slaves", this.options.name);
      if (!Array.isArray(result)) {
        return null;
      }
      const availableSlaves = result.map(utils_1.packObject).filter((slave) => slave.flags && !slave.flags.match(/(disconnected|s_down|o_down)/));
      return this.sentinelNatResolve(selectPreferredSentinel(availableSlaves, this.options.preferredSlaves));
    }
    sentinelNatResolve(item) {
      if (!item || !this.options.natMap)
        return item;
      const key = `${item.host}:${item.port}`;
      let result = item;
      if (typeof this.options.natMap === "function") {
        result = this.options.natMap(key) || item;
      } else if (typeof this.options.natMap === "object") {
        result = this.options.natMap[key] || item;
      }
      return result;
    }
    connectToSentinel(endpoint, options) {
      const redis = new Redis_1.default({
        port: endpoint.port || 26379,
        host: endpoint.host,
        username: this.options.sentinelUsername || null,
        password: this.options.sentinelPassword || null,
        family: endpoint.family || ("path" in this.options && this.options.path ? undefined : this.options.family),
        tls: this.options.sentinelTLS,
        retryStrategy: null,
        enableReadyCheck: false,
        connectTimeout: this.options.connectTimeout,
        commandTimeout: this.options.sentinelCommandTimeout,
        ...options
      });
      return redis;
    }
    async resolve(endpoint) {
      const client = this.connectToSentinel(endpoint);
      client.on("error", noop);
      try {
        if (this.options.role === "slave") {
          return await this.resolveSlave(client);
        } else {
          return await this.resolveMaster(client);
        }
      } finally {
        client.disconnect();
      }
    }
    async initFailoverDetector() {
      var _a;
      if (!this.options.failoverDetector) {
        return;
      }
      this.sentinelIterator.reset(true);
      const sentinels = [];
      while (sentinels.length < this.options.sentinelMaxConnections) {
        const { done, value } = this.sentinelIterator.next();
        if (done) {
          break;
        }
        const client = this.connectToSentinel(value, {
          lazyConnect: true,
          retryStrategy: this.options.sentinelReconnectStrategy
        });
        client.on("reconnecting", () => {
          var _a2;
          (_a2 = this.emitter) === null || _a2 === undefined || _a2.emit("sentinelReconnecting");
        });
        sentinels.push({ address: value, client });
      }
      this.sentinelIterator.reset(false);
      if (this.failoverDetector) {
        this.failoverDetector.cleanup();
      }
      this.failoverDetector = new FailoverDetector_1.FailoverDetector(this, sentinels);
      await this.failoverDetector.subscribe();
      (_a = this.emitter) === null || _a === undefined || _a.emit("failoverSubscribed");
    }
  }
  exports.default = SentinelConnector;
  function selectPreferredSentinel(availableSlaves, preferredSlaves) {
    if (availableSlaves.length === 0) {
      return null;
    }
    let selectedSlave;
    if (typeof preferredSlaves === "function") {
      selectedSlave = preferredSlaves(availableSlaves);
    } else if (preferredSlaves !== null && typeof preferredSlaves === "object") {
      const preferredSlavesArray = Array.isArray(preferredSlaves) ? preferredSlaves : [preferredSlaves];
      preferredSlavesArray.sort((a, b) => {
        if (!a.prio) {
          a.prio = 1;
        }
        if (!b.prio) {
          b.prio = 1;
        }
        if (a.prio < b.prio) {
          return -1;
        }
        if (a.prio > b.prio) {
          return 1;
        }
        return 0;
      });
      for (let p = 0;p < preferredSlavesArray.length; p++) {
        for (let a = 0;a < availableSlaves.length; a++) {
          const slave = availableSlaves[a];
          if (slave.ip === preferredSlavesArray[p].ip) {
            if (slave.port === preferredSlavesArray[p].port) {
              selectedSlave = slave;
              break;
            }
          }
        }
        if (selectedSlave) {
          break;
        }
      }
    }
    if (!selectedSlave) {
      selectedSlave = (0, utils_1.sample)(availableSlaves);
    }
    return addressResponseToAddress(selectedSlave);
  }
  function addressResponseToAddress(input) {
    return { host: input.ip, port: Number(input.port) };
  }
  function noop() {}
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/connectors/index.js
var require_connectors = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.SentinelConnector = exports.StandaloneConnector = undefined;
  var StandaloneConnector_1 = require_StandaloneConnector();
  exports.StandaloneConnector = StandaloneConnector_1.default;
  var SentinelConnector_1 = require_SentinelConnector();
  exports.SentinelConnector = SentinelConnector_1.default;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/errors/MaxRetriesPerRequestError.js
var require_MaxRetriesPerRequestError = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var redis_errors_1 = require_redis_errors();

  class MaxRetriesPerRequestError extends redis_errors_1.AbortError {
    constructor(maxRetriesPerRequest) {
      const message = `Reached the max retries per request limit (which is ${maxRetriesPerRequest}). Refer to "maxRetriesPerRequest" option for details.`;
      super(message);
      Error.captureStackTrace(this, this.constructor);
    }
    get name() {
      return this.constructor.name;
    }
  }
  exports.default = MaxRetriesPerRequestError;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/errors/index.js
var require_errors = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.MaxRetriesPerRequestError = undefined;
  var MaxRetriesPerRequestError_1 = require_MaxRetriesPerRequestError();
  exports.MaxRetriesPerRequestError = MaxRetriesPerRequestError_1.default;
});

// node_modules/.bun/redis-parser@3.0.0/node_modules/redis-parser/lib/parser.js
var require_parser = __commonJS((exports, module) => {
  var Buffer2 = __require("buffer").Buffer;
  var StringDecoder = __require("string_decoder").StringDecoder;
  var decoder = new StringDecoder;
  var errors = require_redis_errors();
  var ReplyError = errors.ReplyError;
  var ParserError = errors.ParserError;
  var bufferPool = Buffer2.allocUnsafe(32 * 1024);
  var bufferOffset = 0;
  var interval = null;
  var counter = 0;
  var notDecreased = 0;
  function parseSimpleNumbers(parser) {
    const length = parser.buffer.length - 1;
    var offset = parser.offset;
    var number = 0;
    var sign = 1;
    if (parser.buffer[offset] === 45) {
      sign = -1;
      offset++;
    }
    while (offset < length) {
      const c1 = parser.buffer[offset++];
      if (c1 === 13) {
        parser.offset = offset + 1;
        return sign * number;
      }
      number = number * 10 + (c1 - 48);
    }
  }
  function parseStringNumbers(parser) {
    const length = parser.buffer.length - 1;
    var offset = parser.offset;
    var number = 0;
    var res = "";
    if (parser.buffer[offset] === 45) {
      res += "-";
      offset++;
    }
    while (offset < length) {
      var c1 = parser.buffer[offset++];
      if (c1 === 13) {
        parser.offset = offset + 1;
        if (number !== 0) {
          res += number;
        }
        return res;
      } else if (number > 429496728) {
        res += number * 10 + (c1 - 48);
        number = 0;
      } else if (c1 === 48 && number === 0) {
        res += 0;
      } else {
        number = number * 10 + (c1 - 48);
      }
    }
  }
  function parseSimpleString(parser) {
    const start = parser.offset;
    const buffer = parser.buffer;
    const length = buffer.length - 1;
    var offset = start;
    while (offset < length) {
      if (buffer[offset++] === 13) {
        parser.offset = offset + 1;
        if (parser.optionReturnBuffers === true) {
          return parser.buffer.slice(start, offset - 1);
        }
        return parser.buffer.toString("utf8", start, offset - 1);
      }
    }
  }
  function parseLength(parser) {
    const length = parser.buffer.length - 1;
    var offset = parser.offset;
    var number = 0;
    while (offset < length) {
      const c1 = parser.buffer[offset++];
      if (c1 === 13) {
        parser.offset = offset + 1;
        return number;
      }
      number = number * 10 + (c1 - 48);
    }
  }
  function parseInteger(parser) {
    if (parser.optionStringNumbers === true) {
      return parseStringNumbers(parser);
    }
    return parseSimpleNumbers(parser);
  }
  function parseBulkString(parser) {
    const length = parseLength(parser);
    if (length === undefined) {
      return;
    }
    if (length < 0) {
      return null;
    }
    const offset = parser.offset + length;
    if (offset + 2 > parser.buffer.length) {
      parser.bigStrSize = offset + 2;
      parser.totalChunkSize = parser.buffer.length;
      parser.bufferCache.push(parser.buffer);
      return;
    }
    const start = parser.offset;
    parser.offset = offset + 2;
    if (parser.optionReturnBuffers === true) {
      return parser.buffer.slice(start, offset);
    }
    return parser.buffer.toString("utf8", start, offset);
  }
  function parseError(parser) {
    var string = parseSimpleString(parser);
    if (string !== undefined) {
      if (parser.optionReturnBuffers === true) {
        string = string.toString();
      }
      return new ReplyError(string);
    }
  }
  function handleError(parser, type) {
    const err = new ParserError("Protocol error, got " + JSON.stringify(String.fromCharCode(type)) + " as reply type byte", JSON.stringify(parser.buffer), parser.offset);
    parser.buffer = null;
    parser.returnFatalError(err);
  }
  function parseArray(parser) {
    const length = parseLength(parser);
    if (length === undefined) {
      return;
    }
    if (length < 0) {
      return null;
    }
    const responses = new Array(length);
    return parseArrayElements(parser, responses, 0);
  }
  function pushArrayCache(parser, array, pos) {
    parser.arrayCache.push(array);
    parser.arrayPos.push(pos);
  }
  function parseArrayChunks(parser) {
    const tmp = parser.arrayCache.pop();
    var pos = parser.arrayPos.pop();
    if (parser.arrayCache.length) {
      const res = parseArrayChunks(parser);
      if (res === undefined) {
        pushArrayCache(parser, tmp, pos);
        return;
      }
      tmp[pos++] = res;
    }
    return parseArrayElements(parser, tmp, pos);
  }
  function parseArrayElements(parser, responses, i) {
    const bufferLength = parser.buffer.length;
    while (i < responses.length) {
      const offset = parser.offset;
      if (parser.offset >= bufferLength) {
        pushArrayCache(parser, responses, i);
        return;
      }
      const response = parseType(parser, parser.buffer[parser.offset++]);
      if (response === undefined) {
        if (!(parser.arrayCache.length || parser.bufferCache.length)) {
          parser.offset = offset;
        }
        pushArrayCache(parser, responses, i);
        return;
      }
      responses[i] = response;
      i++;
    }
    return responses;
  }
  function parseType(parser, type) {
    switch (type) {
      case 36:
        return parseBulkString(parser);
      case 43:
        return parseSimpleString(parser);
      case 42:
        return parseArray(parser);
      case 58:
        return parseInteger(parser);
      case 45:
        return parseError(parser);
      default:
        return handleError(parser, type);
    }
  }
  function decreaseBufferPool() {
    if (bufferPool.length > 50 * 1024) {
      if (counter === 1 || notDecreased > counter * 2) {
        const minSliceLen = Math.floor(bufferPool.length / 10);
        const sliceLength = minSliceLen < bufferOffset ? bufferOffset : minSliceLen;
        bufferOffset = 0;
        bufferPool = bufferPool.slice(sliceLength, bufferPool.length);
      } else {
        notDecreased++;
        counter--;
      }
    } else {
      clearInterval(interval);
      counter = 0;
      notDecreased = 0;
      interval = null;
    }
  }
  function resizeBuffer(length) {
    if (bufferPool.length < length + bufferOffset) {
      const multiplier = length > 1024 * 1024 * 75 ? 2 : 3;
      if (bufferOffset > 1024 * 1024 * 111) {
        bufferOffset = 1024 * 1024 * 50;
      }
      bufferPool = Buffer2.allocUnsafe(length * multiplier + bufferOffset);
      bufferOffset = 0;
      counter++;
      if (interval === null) {
        interval = setInterval(decreaseBufferPool, 50);
      }
    }
  }
  function concatBulkString(parser) {
    const list = parser.bufferCache;
    const oldOffset = parser.offset;
    var chunks = list.length;
    var offset = parser.bigStrSize - parser.totalChunkSize;
    parser.offset = offset;
    if (offset <= 2) {
      if (chunks === 2) {
        return list[0].toString("utf8", oldOffset, list[0].length + offset - 2);
      }
      chunks--;
      offset = list[list.length - 2].length + offset;
    }
    var res = decoder.write(list[0].slice(oldOffset));
    for (var i = 1;i < chunks - 1; i++) {
      res += decoder.write(list[i]);
    }
    res += decoder.end(list[i].slice(0, offset - 2));
    return res;
  }
  function concatBulkBuffer(parser) {
    const list = parser.bufferCache;
    const oldOffset = parser.offset;
    const length = parser.bigStrSize - oldOffset - 2;
    var chunks = list.length;
    var offset = parser.bigStrSize - parser.totalChunkSize;
    parser.offset = offset;
    if (offset <= 2) {
      if (chunks === 2) {
        return list[0].slice(oldOffset, list[0].length + offset - 2);
      }
      chunks--;
      offset = list[list.length - 2].length + offset;
    }
    resizeBuffer(length);
    const start = bufferOffset;
    list[0].copy(bufferPool, start, oldOffset, list[0].length);
    bufferOffset += list[0].length - oldOffset;
    for (var i = 1;i < chunks - 1; i++) {
      list[i].copy(bufferPool, bufferOffset);
      bufferOffset += list[i].length;
    }
    list[i].copy(bufferPool, bufferOffset, 0, offset - 2);
    bufferOffset += offset - 2;
    return bufferPool.slice(start, bufferOffset);
  }

  class JavascriptRedisParser {
    constructor(options) {
      if (!options) {
        throw new TypeError("Options are mandatory.");
      }
      if (typeof options.returnError !== "function" || typeof options.returnReply !== "function") {
        throw new TypeError("The returnReply and returnError options have to be functions.");
      }
      this.setReturnBuffers(!!options.returnBuffers);
      this.setStringNumbers(!!options.stringNumbers);
      this.returnError = options.returnError;
      this.returnFatalError = options.returnFatalError || options.returnError;
      this.returnReply = options.returnReply;
      this.reset();
    }
    reset() {
      this.offset = 0;
      this.buffer = null;
      this.bigStrSize = 0;
      this.totalChunkSize = 0;
      this.bufferCache = [];
      this.arrayCache = [];
      this.arrayPos = [];
    }
    setReturnBuffers(returnBuffers) {
      if (typeof returnBuffers !== "boolean") {
        throw new TypeError("The returnBuffers argument has to be a boolean");
      }
      this.optionReturnBuffers = returnBuffers;
    }
    setStringNumbers(stringNumbers) {
      if (typeof stringNumbers !== "boolean") {
        throw new TypeError("The stringNumbers argument has to be a boolean");
      }
      this.optionStringNumbers = stringNumbers;
    }
    execute(buffer) {
      if (this.buffer === null) {
        this.buffer = buffer;
        this.offset = 0;
      } else if (this.bigStrSize === 0) {
        const oldLength = this.buffer.length;
        const remainingLength = oldLength - this.offset;
        const newBuffer = Buffer2.allocUnsafe(remainingLength + buffer.length);
        this.buffer.copy(newBuffer, 0, this.offset, oldLength);
        buffer.copy(newBuffer, remainingLength, 0, buffer.length);
        this.buffer = newBuffer;
        this.offset = 0;
        if (this.arrayCache.length) {
          const arr = parseArrayChunks(this);
          if (arr === undefined) {
            return;
          }
          this.returnReply(arr);
        }
      } else if (this.totalChunkSize + buffer.length >= this.bigStrSize) {
        this.bufferCache.push(buffer);
        var tmp = this.optionReturnBuffers ? concatBulkBuffer(this) : concatBulkString(this);
        this.bigStrSize = 0;
        this.bufferCache = [];
        this.buffer = buffer;
        if (this.arrayCache.length) {
          this.arrayCache[0][this.arrayPos[0]++] = tmp;
          tmp = parseArrayChunks(this);
          if (tmp === undefined) {
            return;
          }
        }
        this.returnReply(tmp);
      } else {
        this.bufferCache.push(buffer);
        this.totalChunkSize += buffer.length;
        return;
      }
      while (this.offset < this.buffer.length) {
        const offset = this.offset;
        const type = this.buffer[this.offset++];
        const response = parseType(this, type);
        if (response === undefined) {
          if (!(this.arrayCache.length || this.bufferCache.length)) {
            this.offset = offset;
          }
          return;
        }
        if (type === 45) {
          this.returnError(response);
        } else {
          this.returnReply(response);
        }
      }
      this.buffer = null;
    }
  }
  module.exports = JavascriptRedisParser;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/SubscriptionSet.js
var require_SubscriptionSet = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });

  class SubscriptionSet {
    constructor() {
      this.set = {
        subscribe: {},
        psubscribe: {},
        ssubscribe: {}
      };
    }
    add(set, channel) {
      this.set[mapSet(set)][channel] = true;
    }
    del(set, channel) {
      delete this.set[mapSet(set)][channel];
    }
    channels(set) {
      return Object.keys(this.set[mapSet(set)]);
    }
    isEmpty() {
      return this.channels("subscribe").length === 0 && this.channels("psubscribe").length === 0 && this.channels("ssubscribe").length === 0;
    }
  }
  exports.default = SubscriptionSet;
  function mapSet(set) {
    if (set === "unsubscribe") {
      return "subscribe";
    }
    if (set === "punsubscribe") {
      return "psubscribe";
    }
    if (set === "sunsubscribe") {
      return "ssubscribe";
    }
    return set;
  }
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/DataHandler.js
var require_DataHandler = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var Command_1 = require_Command();
  var utils_1 = require_utils2();
  var RedisParser = require_parser();
  var SubscriptionSet_1 = require_SubscriptionSet();
  var debug = (0, utils_1.Debug)("dataHandler");

  class DataHandler {
    constructor(redis, parserOptions) {
      this.redis = redis;
      const parser = new RedisParser({
        stringNumbers: parserOptions.stringNumbers,
        returnBuffers: true,
        returnError: (err) => {
          this.returnError(err);
        },
        returnFatalError: (err) => {
          this.returnFatalError(err);
        },
        returnReply: (reply) => {
          this.returnReply(reply);
        }
      });
      redis.stream.prependListener("data", (data) => {
        parser.execute(data);
      });
      redis.stream.resume();
    }
    returnFatalError(err) {
      err.message += ". Please report this.";
      this.redis.recoverFromFatalError(err, err, { offlineQueue: false });
    }
    returnError(err) {
      const item = this.shiftCommand(err);
      if (!item) {
        return;
      }
      err.command = {
        name: item.command.name,
        args: item.command.args
      };
      if (item.command.name == "ssubscribe" && err.message.includes("MOVED")) {
        this.redis.emit("moved");
        return;
      }
      this.redis.handleReconnection(err, item);
    }
    returnReply(reply) {
      if (this.handleMonitorReply(reply)) {
        return;
      }
      if (this.handleSubscriberReply(reply)) {
        return;
      }
      const item = this.shiftCommand(reply);
      if (!item) {
        return;
      }
      if (Command_1.default.checkFlag("ENTER_SUBSCRIBER_MODE", item.command.name)) {
        this.redis.condition.subscriber = new SubscriptionSet_1.default;
        this.redis.condition.subscriber.add(item.command.name, reply[1].toString());
        if (!fillSubCommand(item.command, reply[2])) {
          this.redis.commandQueue.unshift(item);
        }
      } else if (Command_1.default.checkFlag("EXIT_SUBSCRIBER_MODE", item.command.name)) {
        if (!fillUnsubCommand(item.command, reply[2])) {
          this.redis.commandQueue.unshift(item);
        }
      } else {
        item.command.resolve(reply);
      }
    }
    handleSubscriberReply(reply) {
      if (!this.redis.condition.subscriber) {
        return false;
      }
      const replyType = Array.isArray(reply) ? reply[0].toString() : null;
      debug('receive reply "%s" in subscriber mode', replyType);
      switch (replyType) {
        case "message":
          if (this.redis.listeners("message").length > 0) {
            this.redis.emit("message", reply[1].toString(), reply[2] ? reply[2].toString() : "");
          }
          this.redis.emit("messageBuffer", reply[1], reply[2]);
          break;
        case "pmessage": {
          const pattern = reply[1].toString();
          if (this.redis.listeners("pmessage").length > 0) {
            this.redis.emit("pmessage", pattern, reply[2].toString(), reply[3].toString());
          }
          this.redis.emit("pmessageBuffer", pattern, reply[2], reply[3]);
          break;
        }
        case "smessage": {
          if (this.redis.listeners("smessage").length > 0) {
            this.redis.emit("smessage", reply[1].toString(), reply[2] ? reply[2].toString() : "");
          }
          this.redis.emit("smessageBuffer", reply[1], reply[2]);
          break;
        }
        case "ssubscribe":
        case "subscribe":
        case "psubscribe": {
          const channel = reply[1].toString();
          this.redis.condition.subscriber.add(replyType, channel);
          const item = this.shiftCommand(reply);
          if (!item) {
            return;
          }
          if (!fillSubCommand(item.command, reply[2])) {
            this.redis.commandQueue.unshift(item);
          }
          break;
        }
        case "sunsubscribe":
        case "unsubscribe":
        case "punsubscribe": {
          const channel = reply[1] ? reply[1].toString() : null;
          if (channel) {
            this.redis.condition.subscriber.del(replyType, channel);
          }
          const count = reply[2];
          if (Number(count) === 0) {
            this.redis.condition.subscriber = false;
          }
          const item = this.shiftCommand(reply);
          if (!item) {
            return;
          }
          if (!fillUnsubCommand(item.command, count)) {
            this.redis.commandQueue.unshift(item);
          }
          break;
        }
        default: {
          const item = this.shiftCommand(reply);
          if (!item) {
            return;
          }
          item.command.resolve(reply);
        }
      }
      return true;
    }
    handleMonitorReply(reply) {
      if (this.redis.status !== "monitoring") {
        return false;
      }
      const replyStr = reply.toString();
      if (replyStr === "OK") {
        return false;
      }
      const len = replyStr.indexOf(" ");
      const timestamp = replyStr.slice(0, len);
      const argIndex = replyStr.indexOf('"');
      const args = replyStr.slice(argIndex + 1, -1).split('" "').map((elem) => elem.replace(/\\"/g, '"'));
      const dbAndSource = replyStr.slice(len + 2, argIndex - 2).split(" ");
      this.redis.emit("monitor", timestamp, args, dbAndSource[1], dbAndSource[0]);
      return true;
    }
    shiftCommand(reply) {
      const item = this.redis.commandQueue.shift();
      if (!item) {
        const message = "Command queue state error. If you can reproduce this, please report it.";
        const error = new Error(message + (reply instanceof Error ? ` Last error: ${reply.message}` : ` Last reply: ${reply.toString()}`));
        this.redis.emit("error", error);
        return null;
      }
      return item;
    }
  }
  exports.default = DataHandler;
  var remainingRepliesMap = new WeakMap;
  function fillSubCommand(command, count) {
    let remainingReplies = remainingRepliesMap.has(command) ? remainingRepliesMap.get(command) : command.args.length;
    remainingReplies -= 1;
    if (remainingReplies <= 0) {
      command.resolve(count);
      remainingRepliesMap.delete(command);
      return true;
    }
    remainingRepliesMap.set(command, remainingReplies);
    return false;
  }
  function fillUnsubCommand(command, count) {
    let remainingReplies = remainingRepliesMap.has(command) ? remainingRepliesMap.get(command) : command.args.length;
    if (remainingReplies === 0) {
      if (Number(count) === 0) {
        remainingRepliesMap.delete(command);
        command.resolve(count);
        return true;
      }
      return false;
    }
    remainingReplies -= 1;
    if (remainingReplies <= 0) {
      command.resolve(count);
      return true;
    }
    remainingRepliesMap.set(command, remainingReplies);
    return false;
  }
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/redis/event_handler.js
var require_event_handler = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.readyHandler = exports.errorHandler = exports.closeHandler = exports.connectHandler = undefined;
  var redis_errors_1 = require_redis_errors();
  var Command_1 = require_Command();
  var errors_1 = require_errors();
  var utils_1 = require_utils2();
  var DataHandler_1 = require_DataHandler();
  var debug = (0, utils_1.Debug)("connection");
  function connectHandler(self) {
    return function() {
      var _a;
      self.setStatus("connect");
      self.resetCommandQueue();
      let flushed = false;
      const { connectionEpoch } = self;
      if (self.condition.auth) {
        self.auth(self.condition.auth, function(err) {
          if (connectionEpoch !== self.connectionEpoch) {
            return;
          }
          if (err) {
            if (err.message.indexOf("no password is set") !== -1) {
              console.warn("[WARN] Redis server does not require a password, but a password was supplied.");
            } else if (err.message.indexOf("without any password configured for the default user") !== -1) {
              console.warn("[WARN] This Redis server's `default` user does not require a password, but a password was supplied");
            } else if (err.message.indexOf("wrong number of arguments for 'auth' command") !== -1) {
              console.warn(`[ERROR] The server returned "wrong number of arguments for 'auth' command". You are probably passing both username and password to Redis version 5 or below. You should only pass the 'password' option for Redis version 5 and under.`);
            } else {
              flushed = true;
              self.recoverFromFatalError(err, err);
            }
          }
        });
      }
      if (self.condition.select) {
        self.select(self.condition.select).catch((err) => {
          self.silentEmit("error", err);
        });
      }
      new DataHandler_1.default(self, {
        stringNumbers: self.options.stringNumbers
      });
      const clientCommandPromises = [];
      if (self.options.connectionName) {
        debug("set the connection name [%s]", self.options.connectionName);
        clientCommandPromises.push(self.client("setname", self.options.connectionName).catch(utils_1.noop));
      }
      if (!self.options.disableClientInfo) {
        debug("set the client info");
        clientCommandPromises.push((0, utils_1.getPackageMeta)().then((packageMeta) => {
          return self.client("SETINFO", "LIB-VER", packageMeta.version).catch(utils_1.noop);
        }).catch(utils_1.noop));
        clientCommandPromises.push(self.client("SETINFO", "LIB-NAME", ((_a = self.options) === null || _a === undefined ? undefined : _a.clientInfoTag) ? `ioredis(${self.options.clientInfoTag})` : "ioredis").catch(utils_1.noop));
      }
      Promise.all(clientCommandPromises).catch(utils_1.noop).finally(() => {
        if (!self.options.enableReadyCheck) {
          exports.readyHandler(self)();
        }
        if (self.options.enableReadyCheck) {
          self._readyCheck(function(err, info) {
            if (connectionEpoch !== self.connectionEpoch) {
              return;
            }
            if (err) {
              if (!flushed) {
                self.recoverFromFatalError(new Error("Ready check failed: " + err.message), err);
              }
            } else {
              if (self.connector.check(info)) {
                exports.readyHandler(self)();
              } else {
                self.disconnect(true);
              }
            }
          });
        }
      });
    };
  }
  exports.connectHandler = connectHandler;
  function abortError(command) {
    const err = new redis_errors_1.AbortError("Command aborted due to connection close");
    err.command = {
      name: command.name,
      args: command.args
    };
    return err;
  }
  function abortIncompletePipelines(commandQueue) {
    var _a;
    let expectedIndex = 0;
    for (let i = 0;i < commandQueue.length; ) {
      const command = (_a = commandQueue.peekAt(i)) === null || _a === undefined ? undefined : _a.command;
      const pipelineIndex = command.pipelineIndex;
      if (pipelineIndex === undefined || pipelineIndex === 0) {
        expectedIndex = 0;
      }
      if (pipelineIndex !== undefined && pipelineIndex !== expectedIndex++) {
        commandQueue.remove(i, 1);
        command.reject(abortError(command));
        continue;
      }
      i++;
    }
  }
  function abortTransactionFragments(commandQueue) {
    var _a;
    for (let i = 0;i < commandQueue.length; ) {
      const command = (_a = commandQueue.peekAt(i)) === null || _a === undefined ? undefined : _a.command;
      if (command.name === "multi") {
        break;
      }
      if (command.name === "exec") {
        commandQueue.remove(i, 1);
        command.reject(abortError(command));
        break;
      }
      if (command.inTransaction) {
        commandQueue.remove(i, 1);
        command.reject(abortError(command));
      } else {
        i++;
      }
    }
  }
  function closeHandler(self) {
    return function() {
      const prevStatus = self.status;
      self.setStatus("close");
      if (self.commandQueue.length) {
        abortIncompletePipelines(self.commandQueue);
      }
      if (self.offlineQueue.length) {
        abortTransactionFragments(self.offlineQueue);
      }
      if (prevStatus === "ready") {
        if (!self.prevCondition) {
          self.prevCondition = self.condition;
        }
        if (self.commandQueue.length) {
          self.prevCommandQueue = self.commandQueue;
        }
      }
      if (self.manuallyClosing) {
        self.manuallyClosing = false;
        debug("skip reconnecting since the connection is manually closed.");
        return close();
      }
      if (typeof self.options.retryStrategy !== "function") {
        debug("skip reconnecting because `retryStrategy` is not a function");
        return close();
      }
      const retryDelay = self.options.retryStrategy(++self.retryAttempts);
      if (typeof retryDelay !== "number") {
        debug("skip reconnecting because `retryStrategy` doesn't return a number");
        return close();
      }
      debug("reconnect in %sms", retryDelay);
      self.setStatus("reconnecting", retryDelay);
      self.reconnectTimeout = setTimeout(function() {
        self.reconnectTimeout = null;
        self.connect().catch(utils_1.noop);
      }, retryDelay);
      const { maxRetriesPerRequest } = self.options;
      if (typeof maxRetriesPerRequest === "number") {
        if (maxRetriesPerRequest < 0) {
          debug("maxRetriesPerRequest is negative, ignoring...");
        } else {
          const remainder = self.retryAttempts % (maxRetriesPerRequest + 1);
          if (remainder === 0) {
            debug("reach maxRetriesPerRequest limitation, flushing command queue...");
            self.flushQueue(new errors_1.MaxRetriesPerRequestError(maxRetriesPerRequest));
          }
        }
      }
    };
    function close() {
      self.setStatus("end");
      self.flushQueue(new Error(utils_1.CONNECTION_CLOSED_ERROR_MSG));
    }
  }
  exports.closeHandler = closeHandler;
  function errorHandler(self) {
    return function(error) {
      debug("error: %s", error);
      self.silentEmit("error", error);
    };
  }
  exports.errorHandler = errorHandler;
  function readyHandler(self) {
    return function() {
      self.setStatus("ready");
      self.retryAttempts = 0;
      if (self.options.monitor) {
        self.call("monitor").then(() => self.setStatus("monitoring"), (error) => self.emit("error", error));
        const { sendCommand } = self;
        self.sendCommand = function(command) {
          if (Command_1.default.checkFlag("VALID_IN_MONITOR_MODE", command.name)) {
            return sendCommand.call(self, command);
          }
          command.reject(new Error("Connection is in monitoring mode, can't process commands."));
          return command.promise;
        };
        self.once("close", function() {
          delete self.sendCommand;
        });
        return;
      }
      const finalSelect = self.prevCondition ? self.prevCondition.select : self.condition.select;
      if (self.options.readOnly) {
        debug("set the connection to readonly mode");
        self.readonly().catch(utils_1.noop);
      }
      if (self.prevCondition) {
        const condition = self.prevCondition;
        self.prevCondition = null;
        if (condition.subscriber && self.options.autoResubscribe) {
          if (self.condition.select !== finalSelect) {
            debug("connect to db [%d]", finalSelect);
            self.select(finalSelect);
          }
          const subscribeChannels = condition.subscriber.channels("subscribe");
          if (subscribeChannels.length) {
            debug("subscribe %d channels", subscribeChannels.length);
            self.subscribe(subscribeChannels);
          }
          const psubscribeChannels = condition.subscriber.channels("psubscribe");
          if (psubscribeChannels.length) {
            debug("psubscribe %d channels", psubscribeChannels.length);
            self.psubscribe(psubscribeChannels);
          }
          const ssubscribeChannels = condition.subscriber.channels("ssubscribe");
          if (ssubscribeChannels.length) {
            debug("ssubscribe %s", ssubscribeChannels.length);
            for (const channel of ssubscribeChannels) {
              self.ssubscribe(channel);
            }
          }
        }
      }
      if (self.prevCommandQueue) {
        if (self.options.autoResendUnfulfilledCommands) {
          debug("resend %d unfulfilled commands", self.prevCommandQueue.length);
          while (self.prevCommandQueue.length > 0) {
            const item = self.prevCommandQueue.shift();
            if (item.select !== self.condition.select && item.command.name !== "select") {
              self.select(item.select);
            }
            self.sendCommand(item.command, item.stream);
          }
        } else {
          self.prevCommandQueue = null;
        }
      }
      if (self.offlineQueue.length) {
        debug("send %d commands in offline queue", self.offlineQueue.length);
        const offlineQueue = self.offlineQueue;
        self.resetOfflineQueue();
        while (offlineQueue.length > 0) {
          const item = offlineQueue.shift();
          if (item.select !== self.condition.select && item.command.name !== "select") {
            self.select(item.select);
          }
          self.sendCommand(item.command, item.stream);
        }
      }
      if (self.condition.select !== finalSelect) {
        debug("connect to db [%d]", finalSelect);
        self.select(finalSelect);
      }
    };
  }
  exports.readyHandler = readyHandler;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/redis/RedisOptions.js
var require_RedisOptions = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.DEFAULT_REDIS_OPTIONS = undefined;
  exports.DEFAULT_REDIS_OPTIONS = {
    port: 6379,
    host: "localhost",
    family: 0,
    connectTimeout: 1e4,
    disconnectTimeout: 2000,
    retryStrategy: function(times) {
      return Math.min(times * 50, 2000);
    },
    keepAlive: 0,
    noDelay: true,
    connectionName: null,
    disableClientInfo: false,
    clientInfoTag: undefined,
    sentinels: null,
    name: null,
    role: "master",
    sentinelRetryStrategy: function(times) {
      return Math.min(times * 10, 1000);
    },
    sentinelReconnectStrategy: function() {
      return 60000;
    },
    natMap: null,
    enableTLSForSentinelMode: false,
    updateSentinels: true,
    failoverDetector: false,
    username: null,
    password: null,
    db: 0,
    enableOfflineQueue: true,
    enableReadyCheck: true,
    autoResubscribe: true,
    autoResendUnfulfilledCommands: true,
    lazyConnect: false,
    keyPrefix: "",
    reconnectOnError: null,
    readOnly: false,
    stringNumbers: false,
    maxRetriesPerRequest: 20,
    maxLoadingRetryTime: 1e4,
    enableAutoPipelining: false,
    autoPipeliningIgnoredCommands: [],
    sentinelMaxConnections: 10,
    blockingTimeoutGrace: 100
  };
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/Redis.js
var require_Redis = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var commands_1 = require_built();
  var events_1 = __require("events");
  var standard_as_callback_1 = require_built2();
  var cluster_1 = require_cluster();
  var Command_1 = require_Command();
  var connectors_1 = require_connectors();
  var SentinelConnector_1 = require_SentinelConnector();
  var eventHandler = require_event_handler();
  var RedisOptions_1 = require_RedisOptions();
  var ScanStream_1 = require_ScanStream();
  var transaction_1 = require_transaction();
  var utils_1 = require_utils2();
  var applyMixin_1 = require_applyMixin();
  var Commander_1 = require_Commander();
  var lodash_1 = require_lodash3();
  var Deque = require_denque();
  var debug = (0, utils_1.Debug)("redis");

  class Redis extends Commander_1.default {
    constructor(arg1, arg2, arg3) {
      super();
      this.status = "wait";
      this.isCluster = false;
      this.reconnectTimeout = null;
      this.connectionEpoch = 0;
      this.retryAttempts = 0;
      this.manuallyClosing = false;
      this._autoPipelines = new Map;
      this._runningAutoPipelines = new Set;
      this.parseOptions(arg1, arg2, arg3);
      events_1.EventEmitter.call(this);
      this.resetCommandQueue();
      this.resetOfflineQueue();
      if (this.options.Connector) {
        this.connector = new this.options.Connector(this.options);
      } else if (this.options.sentinels) {
        const sentinelConnector = new SentinelConnector_1.default(this.options);
        sentinelConnector.emitter = this;
        this.connector = sentinelConnector;
      } else {
        this.connector = new connectors_1.StandaloneConnector(this.options);
      }
      if (this.options.scripts) {
        Object.entries(this.options.scripts).forEach(([name, definition]) => {
          this.defineCommand(name, definition);
        });
      }
      if (this.options.lazyConnect) {
        this.setStatus("wait");
      } else {
        this.connect().catch(lodash_1.noop);
      }
    }
    static createClient(...args) {
      return new Redis(...args);
    }
    get autoPipelineQueueSize() {
      let queued = 0;
      for (const pipeline of this._autoPipelines.values()) {
        queued += pipeline.length;
      }
      return queued;
    }
    connect(callback) {
      const promise = new Promise((resolve, reject) => {
        if (this.status === "connecting" || this.status === "connect" || this.status === "ready") {
          reject(new Error("Redis is already connecting/connected"));
          return;
        }
        this.connectionEpoch += 1;
        this.setStatus("connecting");
        const { options } = this;
        this.condition = {
          select: options.db,
          auth: options.username ? [options.username, options.password] : options.password,
          subscriber: false
        };
        const _this = this;
        (0, standard_as_callback_1.default)(this.connector.connect(function(type, err) {
          _this.silentEmit(type, err);
        }), function(err, stream) {
          if (err) {
            _this.flushQueue(err);
            _this.silentEmit("error", err);
            reject(err);
            _this.setStatus("end");
            return;
          }
          let CONNECT_EVENT = options.tls ? "secureConnect" : "connect";
          if ("sentinels" in options && options.sentinels && !options.enableTLSForSentinelMode) {
            CONNECT_EVENT = "connect";
          }
          _this.stream = stream;
          if (options.noDelay) {
            stream.setNoDelay(true);
          }
          if (typeof options.keepAlive === "number") {
            if (stream.connecting) {
              stream.once(CONNECT_EVENT, () => {
                stream.setKeepAlive(true, options.keepAlive);
              });
            } else {
              stream.setKeepAlive(true, options.keepAlive);
            }
          }
          if (stream.connecting) {
            stream.once(CONNECT_EVENT, eventHandler.connectHandler(_this));
            if (options.connectTimeout) {
              let connectTimeoutCleared = false;
              stream.setTimeout(options.connectTimeout, function() {
                if (connectTimeoutCleared) {
                  return;
                }
                stream.setTimeout(0);
                stream.destroy();
                const err2 = new Error("connect ETIMEDOUT");
                err2.errorno = "ETIMEDOUT";
                err2.code = "ETIMEDOUT";
                err2.syscall = "connect";
                eventHandler.errorHandler(_this)(err2);
              });
              stream.once(CONNECT_EVENT, function() {
                connectTimeoutCleared = true;
                stream.setTimeout(0);
              });
            }
          } else if (stream.destroyed) {
            const firstError = _this.connector.firstError;
            if (firstError) {
              process.nextTick(() => {
                eventHandler.errorHandler(_this)(firstError);
              });
            }
            process.nextTick(eventHandler.closeHandler(_this));
          } else {
            process.nextTick(eventHandler.connectHandler(_this));
          }
          if (!stream.destroyed) {
            stream.once("error", eventHandler.errorHandler(_this));
            stream.once("close", eventHandler.closeHandler(_this));
          }
          const connectionReadyHandler = function() {
            _this.removeListener("close", connectionCloseHandler);
            resolve();
          };
          var connectionCloseHandler = function() {
            _this.removeListener("ready", connectionReadyHandler);
            reject(new Error(utils_1.CONNECTION_CLOSED_ERROR_MSG));
          };
          _this.once("ready", connectionReadyHandler);
          _this.once("close", connectionCloseHandler);
        });
      });
      return (0, standard_as_callback_1.default)(promise, callback);
    }
    disconnect(reconnect = false) {
      if (!reconnect) {
        this.manuallyClosing = true;
      }
      if (this.reconnectTimeout && !reconnect) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      if (this.status === "wait") {
        eventHandler.closeHandler(this)();
      } else {
        this.connector.disconnect();
      }
    }
    end() {
      this.disconnect();
    }
    duplicate(override) {
      return new Redis({ ...this.options, ...override });
    }
    get mode() {
      var _a;
      return this.options.monitor ? "monitor" : ((_a = this.condition) === null || _a === undefined ? undefined : _a.subscriber) ? "subscriber" : "normal";
    }
    monitor(callback) {
      const monitorInstance = this.duplicate({
        monitor: true,
        lazyConnect: false
      });
      return (0, standard_as_callback_1.default)(new Promise(function(resolve, reject) {
        monitorInstance.once("error", reject);
        monitorInstance.once("monitoring", function() {
          resolve(monitorInstance);
        });
      }), callback);
    }
    sendCommand(command, stream) {
      var _a, _b;
      if (this.status === "wait") {
        this.connect().catch(lodash_1.noop);
      }
      if (this.status === "end") {
        command.reject(new Error(utils_1.CONNECTION_CLOSED_ERROR_MSG));
        return command.promise;
      }
      if (((_a = this.condition) === null || _a === undefined ? undefined : _a.subscriber) && !Command_1.default.checkFlag("VALID_IN_SUBSCRIBER_MODE", command.name)) {
        command.reject(new Error("Connection in subscriber mode, only subscriber commands may be used"));
        return command.promise;
      }
      if (typeof this.options.commandTimeout === "number") {
        command.setTimeout(this.options.commandTimeout);
      }
      const blockingTimeout = this.getBlockingTimeoutInMs(command);
      let writable = this.status === "ready" || !stream && this.status === "connect" && (0, commands_1.exists)(command.name, { caseInsensitive: true }) && ((0, commands_1.hasFlag)(command.name, "loading", { nameCaseInsensitive: true }) || Command_1.default.checkFlag("HANDSHAKE_COMMANDS", command.name));
      if (!this.stream) {
        writable = false;
      } else if (!this.stream.writable) {
        writable = false;
      } else if (this.stream._writableState && this.stream._writableState.ended) {
        writable = false;
      }
      if (!writable) {
        if (!this.options.enableOfflineQueue) {
          command.reject(new Error("Stream isn't writeable and enableOfflineQueue options is false"));
          return command.promise;
        }
        if (command.name === "quit" && this.offlineQueue.length === 0) {
          this.disconnect();
          command.resolve(Buffer.from("OK"));
          return command.promise;
        }
        if (debug.enabled) {
          debug("queue command[%s]: %d -> %s(%o)", this._getDescription(), this.condition.select, command.name, command.args);
        }
        this.offlineQueue.push({
          command,
          stream,
          select: this.condition.select
        });
        if (Command_1.default.checkFlag("BLOCKING_COMMANDS", command.name)) {
          const offlineTimeout = this.getConfiguredBlockingTimeout();
          if (offlineTimeout !== undefined) {
            command.setBlockingTimeout(offlineTimeout);
          }
        }
      } else {
        if (debug.enabled) {
          debug("write command[%s]: %d -> %s(%o)", this._getDescription(), (_b = this.condition) === null || _b === undefined ? undefined : _b.select, command.name, command.args);
        }
        if (stream) {
          if ("isPipeline" in stream && stream.isPipeline) {
            stream.write(command.toWritable(stream.destination.redis.stream));
          } else {
            stream.write(command.toWritable(stream));
          }
        } else {
          this.stream.write(command.toWritable(this.stream));
        }
        this.commandQueue.push({
          command,
          stream,
          select: this.condition.select
        });
        if (blockingTimeout !== undefined) {
          command.setBlockingTimeout(blockingTimeout);
        }
        if (Command_1.default.checkFlag("WILL_DISCONNECT", command.name)) {
          this.manuallyClosing = true;
        }
        if (this.options.socketTimeout !== undefined && this.socketTimeoutTimer === undefined) {
          this.setSocketTimeout();
        }
      }
      if (command.name === "select" && (0, utils_1.isInt)(command.args[0])) {
        const db = parseInt(command.args[0], 10);
        if (this.condition.select !== db) {
          this.condition.select = db;
          this.emit("select", db);
          debug("switch to db [%d]", this.condition.select);
        }
      }
      return command.promise;
    }
    getBlockingTimeoutInMs(command) {
      var _a;
      if (!Command_1.default.checkFlag("BLOCKING_COMMANDS", command.name)) {
        return;
      }
      const configuredTimeout = this.getConfiguredBlockingTimeout();
      if (configuredTimeout === undefined) {
        return;
      }
      const timeout = command.extractBlockingTimeout();
      if (typeof timeout === "number") {
        if (timeout > 0) {
          return timeout + ((_a = this.options.blockingTimeoutGrace) !== null && _a !== undefined ? _a : RedisOptions_1.DEFAULT_REDIS_OPTIONS.blockingTimeoutGrace);
        }
        return configuredTimeout;
      }
      if (timeout === null) {
        return configuredTimeout;
      }
      return;
    }
    getConfiguredBlockingTimeout() {
      if (typeof this.options.blockingTimeout === "number" && this.options.blockingTimeout > 0) {
        return this.options.blockingTimeout;
      }
      return;
    }
    setSocketTimeout() {
      this.socketTimeoutTimer = setTimeout(() => {
        this.stream.destroy(new Error(`Socket timeout. Expecting data, but didn't receive any in ${this.options.socketTimeout}ms.`));
        this.socketTimeoutTimer = undefined;
      }, this.options.socketTimeout);
      this.stream.once("data", () => {
        clearTimeout(this.socketTimeoutTimer);
        this.socketTimeoutTimer = undefined;
        if (this.commandQueue.length === 0)
          return;
        this.setSocketTimeout();
      });
    }
    scanStream(options) {
      return this.createScanStream("scan", { options });
    }
    scanBufferStream(options) {
      return this.createScanStream("scanBuffer", { options });
    }
    sscanStream(key, options) {
      return this.createScanStream("sscan", { key, options });
    }
    sscanBufferStream(key, options) {
      return this.createScanStream("sscanBuffer", { key, options });
    }
    hscanStream(key, options) {
      return this.createScanStream("hscan", { key, options });
    }
    hscanBufferStream(key, options) {
      return this.createScanStream("hscanBuffer", { key, options });
    }
    zscanStream(key, options) {
      return this.createScanStream("zscan", { key, options });
    }
    zscanBufferStream(key, options) {
      return this.createScanStream("zscanBuffer", { key, options });
    }
    silentEmit(eventName, arg) {
      let error;
      if (eventName === "error") {
        error = arg;
        if (this.status === "end") {
          return;
        }
        if (this.manuallyClosing) {
          if (error instanceof Error && (error.message === utils_1.CONNECTION_CLOSED_ERROR_MSG || error.syscall === "connect" || error.syscall === "read")) {
            return;
          }
        }
      }
      if (this.listeners(eventName).length > 0) {
        return this.emit.apply(this, arguments);
      }
      if (error && error instanceof Error) {
        console.error("[ioredis] Unhandled error event:", error.stack);
      }
      return false;
    }
    recoverFromFatalError(_commandError, err, options) {
      this.flushQueue(err, options);
      this.silentEmit("error", err);
      this.disconnect(true);
    }
    handleReconnection(err, item) {
      var _a;
      let needReconnect = false;
      if (this.options.reconnectOnError && !Command_1.default.checkFlag("IGNORE_RECONNECT_ON_ERROR", item.command.name)) {
        needReconnect = this.options.reconnectOnError(err);
      }
      switch (needReconnect) {
        case 1:
        case true:
          if (this.status !== "reconnecting") {
            this.disconnect(true);
          }
          item.command.reject(err);
          break;
        case 2:
          if (this.status !== "reconnecting") {
            this.disconnect(true);
          }
          if (((_a = this.condition) === null || _a === undefined ? undefined : _a.select) !== item.select && item.command.name !== "select") {
            this.select(item.select);
          }
          this.sendCommand(item.command);
          break;
        default:
          item.command.reject(err);
      }
    }
    _getDescription() {
      let description;
      if ("path" in this.options && this.options.path) {
        description = this.options.path;
      } else if (this.stream && this.stream.remoteAddress && this.stream.remotePort) {
        description = this.stream.remoteAddress + ":" + this.stream.remotePort;
      } else if ("host" in this.options && this.options.host) {
        description = this.options.host + ":" + this.options.port;
      } else {
        description = "";
      }
      if (this.options.connectionName) {
        description += ` (${this.options.connectionName})`;
      }
      return description;
    }
    resetCommandQueue() {
      this.commandQueue = new Deque;
    }
    resetOfflineQueue() {
      this.offlineQueue = new Deque;
    }
    parseOptions(...args) {
      const options = {};
      let isTls = false;
      for (let i = 0;i < args.length; ++i) {
        const arg = args[i];
        if (arg === null || typeof arg === "undefined") {
          continue;
        }
        if (typeof arg === "object") {
          (0, lodash_1.defaults)(options, arg);
        } else if (typeof arg === "string") {
          (0, lodash_1.defaults)(options, (0, utils_1.parseURL)(arg));
          if (arg.startsWith("rediss://")) {
            isTls = true;
          }
        } else if (typeof arg === "number") {
          options.port = arg;
        } else {
          throw new Error("Invalid argument " + arg);
        }
      }
      if (isTls) {
        (0, lodash_1.defaults)(options, { tls: true });
      }
      (0, lodash_1.defaults)(options, Redis.defaultOptions);
      if (typeof options.port === "string") {
        options.port = parseInt(options.port, 10);
      }
      if (typeof options.db === "string") {
        options.db = parseInt(options.db, 10);
      }
      this.options = (0, utils_1.resolveTLSProfile)(options);
    }
    setStatus(status, arg) {
      if (debug.enabled) {
        debug("status[%s]: %s -> %s", this._getDescription(), this.status || "[empty]", status);
      }
      this.status = status;
      process.nextTick(this.emit.bind(this, status, arg));
    }
    createScanStream(command, { key, options = {} }) {
      return new ScanStream_1.default({
        objectMode: true,
        key,
        redis: this,
        command,
        ...options
      });
    }
    flushQueue(error, options) {
      options = (0, lodash_1.defaults)({}, options, {
        offlineQueue: true,
        commandQueue: true
      });
      let item;
      if (options.offlineQueue) {
        while (item = this.offlineQueue.shift()) {
          item.command.reject(error);
        }
      }
      if (options.commandQueue) {
        if (this.commandQueue.length > 0) {
          if (this.stream) {
            this.stream.removeAllListeners("data");
          }
          while (item = this.commandQueue.shift()) {
            item.command.reject(error);
          }
        }
      }
    }
    _readyCheck(callback) {
      const _this = this;
      this.info(function(err, res) {
        if (err) {
          if (err.message && err.message.includes("NOPERM")) {
            console.warn(`Skipping the ready check because INFO command fails: "${err.message}". You can disable ready check with "enableReadyCheck". More: https://github.com/luin/ioredis/wiki/Disable-ready-check.`);
            return callback(null, {});
          }
          return callback(err);
        }
        if (typeof res !== "string") {
          return callback(null, res);
        }
        const info = {};
        const lines = res.split(`\r
`);
        for (let i = 0;i < lines.length; ++i) {
          const [fieldName, ...fieldValueParts] = lines[i].split(":");
          const fieldValue = fieldValueParts.join(":");
          if (fieldValue) {
            info[fieldName] = fieldValue;
          }
        }
        if (!info.loading || info.loading === "0") {
          callback(null, info);
        } else {
          const loadingEtaMs = (info.loading_eta_seconds || 1) * 1000;
          const retryTime = _this.options.maxLoadingRetryTime && _this.options.maxLoadingRetryTime < loadingEtaMs ? _this.options.maxLoadingRetryTime : loadingEtaMs;
          debug("Redis server still loading, trying again in " + retryTime + "ms");
          setTimeout(function() {
            _this._readyCheck(callback);
          }, retryTime);
        }
      }).catch(lodash_1.noop);
    }
  }
  Redis.Cluster = cluster_1.default;
  Redis.Command = Command_1.default;
  Redis.defaultOptions = RedisOptions_1.DEFAULT_REDIS_OPTIONS;
  (0, applyMixin_1.default)(Redis, events_1.EventEmitter);
  (0, transaction_1.addTransactionSupport)(Redis.prototype);
  exports.default = Redis;
});

// node_modules/.bun/ioredis@5.10.0/node_modules/ioredis/built/index.js
var require_built3 = __commonJS((exports, module) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.print = exports.ReplyError = exports.SentinelIterator = exports.SentinelConnector = exports.AbstractConnector = exports.Pipeline = exports.ScanStream = exports.Command = exports.Cluster = exports.Redis = exports.default = undefined;
  exports = module.exports = require_Redis().default;
  var Redis_1 = require_Redis();
  Object.defineProperty(exports, "default", { enumerable: true, get: function() {
    return Redis_1.default;
  } });
  var Redis_2 = require_Redis();
  Object.defineProperty(exports, "Redis", { enumerable: true, get: function() {
    return Redis_2.default;
  } });
  var cluster_1 = require_cluster();
  Object.defineProperty(exports, "Cluster", { enumerable: true, get: function() {
    return cluster_1.default;
  } });
  var Command_1 = require_Command();
  Object.defineProperty(exports, "Command", { enumerable: true, get: function() {
    return Command_1.default;
  } });
  var ScanStream_1 = require_ScanStream();
  Object.defineProperty(exports, "ScanStream", { enumerable: true, get: function() {
    return ScanStream_1.default;
  } });
  var Pipeline_1 = require_Pipeline();
  Object.defineProperty(exports, "Pipeline", { enumerable: true, get: function() {
    return Pipeline_1.default;
  } });
  var AbstractConnector_1 = require_AbstractConnector();
  Object.defineProperty(exports, "AbstractConnector", { enumerable: true, get: function() {
    return AbstractConnector_1.default;
  } });
  var SentinelConnector_1 = require_SentinelConnector();
  Object.defineProperty(exports, "SentinelConnector", { enumerable: true, get: function() {
    return SentinelConnector_1.default;
  } });
  Object.defineProperty(exports, "SentinelIterator", { enumerable: true, get: function() {
    return SentinelConnector_1.SentinelIterator;
  } });
  exports.ReplyError = require_redis_errors().ReplyError;
  Object.defineProperty(exports, "Promise", {
    get() {
      console.warn("ioredis v5 does not support plugging third-party Promise library anymore. Native Promise will be used.");
      return Promise;
    },
    set(_lib) {
      console.warn("ioredis v5 does not support plugging third-party Promise library anymore. Native Promise will be used.");
    }
  });
  function print(err, reply) {
    if (err) {
      console.log("Error: " + err);
    } else {
      console.log("Reply: " + reply);
    }
  }
  exports.print = print;
});

// src/lib/logger.ts
var import_pino = __toESM(require_pino(), 1);
var baseLogger = import_pino.default({
  level: "trace",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true
    }
  }
});

// src/types/redis.ts
var import_ioredis = __toESM(require_built3(), 1);
var import_ioredis2 = __toESM(require_built3(), 1);

// src/lib/judge-error.ts
class CrackedError extends Error {
  code;
  name = "CrackedError";
  constructor(code, opts) {
    const { message = `CrackedError: ${code}`, cause } = opts || {};
    super(message, { cause });
    this.code = code;
  }
}

// src/lib/utils.ts
async function tryCatch(promise) {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
function tryCatchSync(fn) {
  try {
    return { data: fn(), error: null };
  } catch (error) {
    return { data: null, error };
  }
}
var indentStr = (str, count = 1, indent = "  ") => {
  const _indent = indent.repeat(count);
  return str.replace(/^/gm, _indent);
};
var procOutputParser = (input, maxLen = 256) => {
  const text = input.toString();
  if (maxLen <= 0)
    return text;
  if (text.length < maxLen)
    return text;
  const truncatedEnd = `... (truncated ${text.length - maxLen} chars)`;
  return `${text.slice(0, maxLen - truncatedEnd.length)}${truncatedEnd}`;
};
var procResultFormatter = (cmd, proc, header) => {
  const body = [
    `  command: ${cmd.join(" ")}`,
    `  exit code: ${proc.exitCode}`,
    `  pid: ${proc.pid}`,
    `  timed out: ${proc.exitedDueToTimeout ?? false}`,
    "  stdout:",
    indentStr(procOutputParser(proc.stdout, 256), 1, ">   "),
    `  stderr:`,
    indentStr(procOutputParser(proc.stderr, 256), 1, ">   ")
  ].join(`
`);
  if (header) {
    return [header, body].join(`
`);
  }
  return body;
};
var signalExitCodes = {
  130: "SIGINT: Interrupted, did you hit ctrl+c?",
  135: "SIGBUS: Memory/alignment issue?",
  137: "SIGKILL: Process was forcefully killed",
  139: "SIGSEGV: Something went wrong internally to the process",
  141: "SIGPIPE: Broken pipe",
  143: "SIGTERM: Process was manually terminated"
};
function procLogHelper(proc, cmd, logger) {
  const { exitCode, stdout, stderr, pid } = proc;
  const out = procOutputParser(stdout);
  const err = procOutputParser(stderr);
  const baseMsg = `Process ${pid} exited with code ${exitCode}.`;
  const ctx = {
    out,
    err,
    cmd: cmd.join(" ")
  };
  if (exitCode === 0) {
    logger.trace(baseMsg);
  } else if (signalExitCodes[exitCode] !== undefined) {
    logger.warn(ctx, `${baseMsg} ${signalExitCodes[exitCode]}`);
  } else {
    logger.error(ctx, baseMsg);
  }
}
var procLogAndMaybeThrow = (proc, cmd, code, msg, logger) => {
  procLogHelper(proc, cmd, logger);
  if (proc.exitCode !== 0) {
    throw new CrackedError(code, {
      message: procResultFormatter(cmd, proc, msg)
    });
  }
};

// node_modules/.bun/@orpc+shared@1.13.6/node_modules/@orpc/shared/dist/index.mjs
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
function parseEmptyableJSON(text) {
  if (!text) {
    return;
  }
  return JSON.parse(text);
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
// node_modules/.bun/@orpc+client@1.13.6/node_modules/@orpc/client/dist/shared/client.BKHdcV-f.mjs
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
// node_modules/.bun/@orpc+standard-server@1.13.6/node_modules/@orpc/standard-server/dist/index.mjs
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
function assertEventName(event) {
  if (event.includes(`
`)) {
    throw new EventEncoderError("Event's event must not contain a newline character");
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
function encodeEventData(data) {
  const lines = data?.split(/\n/) ?? [];
  let output = "";
  for (const line of lines) {
    output += `data: ${line}
`;
  }
  return output;
}
function encodeEventComments(comments) {
  let output = "";
  for (const comment of comments ?? []) {
    assertEventComment(comment);
    output += `: ${comment}
`;
  }
  return output;
}
function encodeEventMessage(message) {
  let output = "";
  output += encodeEventComments(message.comments);
  if (message.event !== undefined) {
    assertEventName(message.event);
    output += `event: ${message.event}
`;
  }
  if (message.retry !== undefined) {
    assertEventRetry(message.retry);
    output += `retry: ${message.retry}
`;
  }
  if (message.id !== undefined) {
    assertEventId(message.id);
    output += `id: ${message.id}
`;
  }
  output += encodeEventData(message.data);
  output += `
`;
  return output;
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

// node_modules/.bun/@orpc+client@1.13.6/node_modules/@orpc/client/dist/shared/client.BLtwTQUg.mjs
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
// node_modules/.bun/@orpc+client@1.13.6/node_modules/@orpc/client/dist/index.mjs
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

// node_modules/.bun/@orpc+standard-server-fetch@1.13.6/node_modules/@orpc/standard-server-fetch/dist/index.mjs
function toEventIterator(stream, options = {}) {
  const eventStream = stream?.pipeThrough(new TextDecoderStream).pipeThrough(new EventDecoderStream);
  const reader = eventStream?.getReader();
  let span;
  let isCancelled = false;
  return new AsyncIteratorClass(async () => {
    span ??= startSpan("consume_event_iterator_stream");
    try {
      while (true) {
        if (reader === undefined) {
          return { done: true, value: undefined };
        }
        const { done, value: value2 } = await runInSpanContext(span, () => reader.read());
        if (done) {
          if (isCancelled) {
            throw new AbortError("Stream was cancelled");
          }
          return { done: true, value: undefined };
        }
        switch (value2.event) {
          case "message": {
            let message = parseEmptyableJSON(value2.data);
            if (isTypescriptObject(message)) {
              message = withEventMeta(message, value2);
            }
            span?.addEvent("message");
            return { done: false, value: message };
          }
          case "error": {
            let error = new ErrorEvent({
              data: parseEmptyableJSON(value2.data)
            });
            error = withEventMeta(error, value2);
            span?.addEvent("error");
            throw error;
          }
          case "done": {
            let done2 = parseEmptyableJSON(value2.data);
            if (isTypescriptObject(done2)) {
              done2 = withEventMeta(done2, value2);
            }
            span?.addEvent("done");
            return { done: true, value: done2 };
          }
          default: {
            span?.addEvent("maybe_keepalive");
          }
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
        isCancelled = true;
        span?.addEvent("cancelled");
      }
      await runInSpanContext(span, () => reader?.cancel());
    } catch (e) {
      setSpanError(span, e, options);
      throw e;
    } finally {
      span?.end();
    }
  });
}
function toEventStream(iterator, options = {}) {
  const keepAliveEnabled = options.eventIteratorKeepAliveEnabled ?? true;
  const keepAliveInterval = options.eventIteratorKeepAliveInterval ?? 5000;
  const keepAliveComment = options.eventIteratorKeepAliveComment ?? "";
  const initialCommentEnabled = options.eventIteratorInitialCommentEnabled ?? true;
  const initialComment = options.eventIteratorInitialComment ?? "";
  let cancelled = false;
  let timeout;
  let span;
  const stream = new ReadableStream({
    start(controller) {
      span = startSpan("stream_event_iterator");
      if (initialCommentEnabled) {
        controller.enqueue(encodeEventMessage({
          comments: [initialComment]
        }));
      }
    },
    async pull(controller) {
      try {
        if (keepAliveEnabled) {
          timeout = setInterval(() => {
            controller.enqueue(encodeEventMessage({
              comments: [keepAliveComment]
            }));
            span?.addEvent("keepalive");
          }, keepAliveInterval);
        }
        const value2 = await runInSpanContext(span, () => iterator.next());
        clearInterval(timeout);
        if (cancelled) {
          return;
        }
        const meta = getEventMeta(value2.value);
        if (!value2.done || value2.value !== undefined || meta !== undefined) {
          const event = value2.done ? "done" : "message";
          controller.enqueue(encodeEventMessage({
            ...meta,
            event,
            data: stringifyJSON(value2.value)
          }));
          span?.addEvent(event);
        }
        if (value2.done) {
          controller.close();
          span?.end();
        }
      } catch (err) {
        clearInterval(timeout);
        if (cancelled) {
          return;
        }
        if (err instanceof ErrorEvent) {
          controller.enqueue(encodeEventMessage({
            ...getEventMeta(err),
            event: "error",
            data: stringifyJSON(err.data)
          }));
          span?.addEvent("error");
          controller.close();
        } else {
          setSpanError(span, err);
          controller.error(err);
        }
        span?.end();
      }
    },
    async cancel() {
      try {
        cancelled = true;
        clearInterval(timeout);
        span?.addEvent("cancelled");
        await runInSpanContext(span, () => iterator.return?.());
      } catch (e) {
        setSpanError(span, e);
        throw e;
      } finally {
        span?.end();
      }
    }
  }).pipeThrough(new TextEncoderStream);
  return stream;
}
function toStandardBody(re, options = {}) {
  return runWithSpan({ name: "parse_standard_body", signal: options.signal }, async () => {
    const contentDisposition = re.headers.get("content-disposition");
    if (typeof contentDisposition === "string") {
      const fileName = getFilenameFromContentDisposition(contentDisposition) ?? "blob";
      const blob2 = await re.blob();
      return new File([blob2], fileName, {
        type: blob2.type
      });
    }
    const contentType = re.headers.get("content-type");
    if (!contentType || contentType.startsWith("application/json")) {
      const text = await re.text();
      return parseEmptyableJSON(text);
    }
    if (contentType.startsWith("multipart/form-data")) {
      return await re.formData();
    }
    if (contentType.startsWith("application/x-www-form-urlencoded")) {
      const text = await re.text();
      return new URLSearchParams(text);
    }
    if (contentType.startsWith("text/event-stream")) {
      return toEventIterator(re.body, options);
    }
    if (contentType.startsWith("text/plain")) {
      return await re.text();
    }
    const blob = await re.blob();
    return new File([blob], "blob", {
      type: blob.type
    });
  });
}
function toFetchBody(body, headers, options = {}) {
  const currentContentDisposition = headers.get("content-disposition");
  headers.delete("content-type");
  headers.delete("content-disposition");
  if (body === undefined) {
    return;
  }
  if (body instanceof Blob) {
    headers.set("content-type", body.type);
    headers.set("content-length", body.size.toString());
    headers.set("content-disposition", currentContentDisposition ?? generateContentDisposition(body instanceof File ? body.name : "blob"));
    return body;
  }
  if (body instanceof FormData) {
    return body;
  }
  if (body instanceof URLSearchParams) {
    return body;
  }
  if (isAsyncIteratorObject(body)) {
    headers.set("content-type", "text/event-stream");
    return toEventStream(body, options);
  }
  headers.set("content-type", "application/json");
  return stringifyJSON(body);
}
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
function toFetchHeaders(headers, fetchHeaders = new Headers) {
  for (const [key, value2] of Object.entries(headers)) {
    if (Array.isArray(value2)) {
      for (const v of value2) {
        fetchHeaders.append(key, v);
      }
    } else if (value2 !== undefined) {
      fetchHeaders.append(key, value2);
    }
  }
  return fetchHeaders;
}
function toFetchRequest(request, options = {}) {
  const headers = toFetchHeaders(request.headers);
  const body = toFetchBody(request.body, headers, options);
  return new Request(request.url, {
    signal: request.signal,
    method: request.method,
    headers,
    body
  });
}
function toStandardLazyResponse(response, options = {}) {
  return {
    body: once(() => toStandardBody(response, options)),
    status: response.status,
    get headers() {
      const headers = toStandardHeaders(response.headers);
      Object.defineProperty(this, "headers", { value: headers, writable: true });
      return headers;
    },
    set headers(value2) {
      Object.defineProperty(this, "headers", { value: value2, writable: true });
    }
  };
}

// node_modules/.bun/@orpc+client@1.13.6/node_modules/@orpc/client/dist/shared/client.vZdLqpTj.mjs
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

// node_modules/.bun/@orpc+client@1.13.6/node_modules/@orpc/client/dist/adapters/fetch/index.mjs
class CompositeLinkFetchPlugin extends CompositeStandardLinkPlugin {
  initRuntimeAdapter(options) {
    for (const plugin of this.plugins) {
      plugin.initRuntimeAdapter?.(options);
    }
  }
}

class LinkFetchClient {
  fetch;
  toFetchRequestOptions;
  adapterInterceptors;
  constructor(options) {
    const plugin = new CompositeLinkFetchPlugin(options.plugins);
    plugin.initRuntimeAdapter(options);
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.toFetchRequestOptions = options;
    this.adapterInterceptors = toArray(options.adapterInterceptors);
  }
  async call(standardRequest, options, path, input) {
    const request = toFetchRequest(standardRequest, this.toFetchRequestOptions);
    const fetchResponse = await intercept(this.adapterInterceptors, { ...options, request, path, input, init: { redirect: "manual" } }, ({ request: request2, path: path2, input: input2, init, ...options2 }) => this.fetch(request2, init, options2, path2, input2));
    const lazyResponse = toStandardLazyResponse(fetchResponse, { signal: request.signal });
    return lazyResponse;
  }
}

class RPCLink extends StandardRPCLink {
  constructor(options) {
    const linkClient = new LinkFetchClient(options);
    super(linkClient, options);
  }
}

// node_modules/.bun/@orpc+standard-server-peer@1.13.6/node_modules/@orpc/standard-server-peer/dist/index.mjs
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
function toEventIterator2(queue, id, cleanup, options = {}) {
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
          const iterator = toEventIterator2(this.serverEventIteratorQueue, id, async (reason) => {
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
      body: isEventIteratorHeaders(payload.headers) ? toEventIterator2(this.clientEventIteratorQueue, id, async (reason) => {
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

// node_modules/.bun/@orpc+client@1.13.6/node_modules/@orpc/client/dist/adapters/websocket/index.mjs
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

class RPCLink2 extends StandardRPCLink {
  constructor(options) {
    const linkClient = new LinkWebsocketClient(options);
    super(linkClient, { ...options, url: "http://orpc" });
  }
}

// src/server/client.ts
var websocket = new WebSocket("ws://localhost:3000");
var vmLink = new RPCLink2({
  websocket
});
var vmClient = createORPCClient(vmLink);
var judgeLink = new RPCLink({
  url: "http://localhost:3000"
});
var judgeClient = createORPCClient(judgeLink);

// src/lib/file-system/dependencies.ts
var dependencies = [
  "mount",
  "umount",
  "rm",
  "mountpoint",
  "mkdir",
  "chown",
  "chmod",
  "mktemp"
];
var missing = dependencies.filter((d) => Bun.which(d) === null);
if (missing.length > 0) {
  throw new CrackedError("FS_DEPENDENCY_CHECK", {
    message: `Missing dependencies: ${indentStr(missing.join(`
`), 1, "  - ")}`
  });
}

// src/lib/file-system/directory/recursive-directory.ts
import path from "path";

// src/lib/file-system/utils.ts
var Bun2 =globalThis.Bun;
import { statSync } from "fs";
var isMountpoint = (dir) => {
  const proc = Bun2.spawnSync(["mountpoint", "-q", dir]);
  return proc.exitCode === 0;
};
var fsLogger = baseLogger.child({}, { msgPrefix: "[FileSys] " });
var fsProcLogAndMaybeThrow = (proc, cmd, code, msg) => {
  procLogAndMaybeThrow(proc, cmd, code, msg, fsLogger);
};
var fileExists = (path) => statSync(path, { throwIfNoEntry: false }) !== undefined;

// src/lib/file-system/directory/base-directory.ts
class BaseDir {
  baseCreateErr;
  baseDestroyErr;
  dir;
  constructor(dir) {
    this.baseCreateErr = `Failed to create directory (${dir})`;
    this.baseDestroyErr = `Failed to destroy directory (${dir})`;
    this.dir = dir;
  }
  destroy = () => {
    if (isMountpoint(this.dir)) {
      throw new CrackedError("FS_DIRECTORY", {
        message: `${this.baseDestroyErr}: Directory is a mount point.`
      });
    }
    if (!fileExists(this.dir)) {
      fsLogger.info(`Directory at ${this.dir} doesn't exist. Skipping destroy()`);
      return;
    }
    this.performDestroy();
  };
  [Symbol.dispose]() {
    this.destroy();
  }
  [Symbol.asyncDispose]() {
    this[Symbol.dispose]();
    return Promise.resolve();
  }
}

// src/lib/file-system/directory/directory.ts
class Dir extends BaseDir {
  constructor(dir) {
    super(dir);
    const cmd = ["mkdir", dir];
    const proc = Bun.spawnSync(cmd, { timeout: 1000 });
    fsProcLogAndMaybeThrow(proc, cmd, "FS_DIRECTORY", this.baseCreateErr);
  }
  performDestroy() {
    const cmd = ["rm", "-rf", this.dir];
    const proc = Bun.spawnSync(cmd, { timeout: 2500 });
    fsProcLogAndMaybeThrow(proc, cmd, "FS_DIRECTORY", this.baseDestroyErr);
  }
}

// src/lib/file-system/directory/recursive-directory.ts
class RecursiveDir extends BaseDir {
  stack;
  performDestroy() {
    this.stack.dispose();
  }
  constructor(dir) {
    dir = path.resolve(dir);
    super(dir);
    this.stack = new DisposableStack;
    const segments = dir.split(path.sep);
    let curPath = "/";
    for (const s of segments) {
      curPath = path.join(curPath, s);
      if (fileExists(curPath)) {
        continue;
      }
      this.stack.use(new Dir(curPath));
    }
  }
}
// src/lib/file-system/directory/temp-directory.ts
class TempDir extends BaseDir {
  constructor(opts) {
    const { template, rootDir } = opts || {};
    const cmd = ["mktemp", "-d"];
    if (rootDir) {
      cmd.push("-p", rootDir);
    }
    if (template) {
      cmd.push(template);
    }
    const proc = Bun.spawnSync(cmd, { timeout: 1000 });
    fsProcLogAndMaybeThrow(proc, cmd, "FS_DIRECTORY", "Failed to create tmp directory");
    const dir = proc.stdout.toString().trim();
    super(dir);
  }
  performDestroy() {
    const cmd = ["rm", "-rf", this.dir];
    const proc = Bun.spawnSync(cmd, { timeout: 2500 });
    fsProcLogAndMaybeThrow(proc, cmd, "FS_DIRECTORY", this.baseDestroyErr);
  }
}
// src/lib/file-system/mount/base-mount.ts
class BaseMount {
  hostDir;
  guestDir;
  baseMountErr;
  baseUnmountErr;
  stack;
  constructor(hostDir, guestDir) {
    this.hostDir = hostDir;
    this.guestDir = guestDir;
    this.baseMountErr = `Failed to mount (${hostDir} -> ${guestDir})`;
    this.baseUnmountErr = `Failed to unmount (${guestDir})`;
    this.stack = new DisposableStack;
    try {
      this.stack.use(new RecursiveDir(hostDir));
      this.stack.use(new RecursiveDir(guestDir));
    } catch (e) {
      const message = `${this.baseMountErr}. CAUSE: (${e.message})`;
      fsLogger.error(message);
      this.destroy();
      throw new CrackedError("FS_MOUNT", { message, cause: e });
    }
  }
  destroy = () => {
    try {
      if (isMountpoint(this.guestDir)) {
        const cmd = ["umount", "-l", this.guestDir];
        const proc = Bun.spawnSync(cmd, { timeout: 1000 });
        fsProcLogAndMaybeThrow(proc, cmd, "FS_MOUNT", this.baseUnmountErr);
      } else {
        fsLogger.info(`Mount at ${this.guestDir} is not a mount point. Skipping destroy()`);
      }
    } finally {
      this.stack.dispose();
    }
  };
  [Symbol.dispose]() {
    try {
      this.destroy();
    } catch (e) {
      throw new CrackedError("RESOURCE_DISPOSAL", {
        message: `Failed to dispose mount (${this.guestDir})`,
        cause: e
      });
    }
  }
  [Symbol.asyncDispose]() {
    this[Symbol.dispose]();
    return Promise.resolve();
  }
}

// src/lib/file-system/mount/overlay-mount.ts
class OverlayMount extends BaseMount {
  create() {
    if (isMountpoint(this.guestDir)) {
      const message = `${this.baseMountErr}: "${this.guestDir}" is already a mountpoint`;
      fsLogger.error(message);
      throw new CrackedError("FS_OVERLAY_MOUNT", {
        message
      });
    }
    const upperRes = tryCatchSync(() => this.stack.use(new TempDir({ template: "" })));
    if (upperRes.error) {
      const message = `${this.baseMountErr}: ${upperRes.error.message}`;
      fsLogger.error(message);
      throw new CrackedError("FS_OVERLAY_MOUNT", {
        message,
        cause: upperRes.error
      });
    }
    const workspaceRes = tryCatchSync(() => this.stack.use(new TempDir));
    if (workspaceRes.error) {
      const message = `${this.baseMountErr}: ${workspaceRes.error.message}`;
      fsLogger.error(message);
      throw new CrackedError("FS_OVERLAY_MOUNT", {
        message,
        cause: workspaceRes.error
      });
    }
    const upper = upperRes.data.dir;
    const workspace = workspaceRes.data.dir;
    const cmd = [
      "mount",
      "-t",
      "overlay",
      "overlay",
      "-o",
      `lowerdir=${this.hostDir},upperdir=${upper},workdir=${workspace}`,
      this.guestDir
    ];
    const proc = Bun.spawnSync(cmd, { timeout: 1000 });
    fsProcLogAndMaybeThrow(proc, cmd, "FS_OVERLAY_MOUNT", this.baseMountErr);
  }
  constructor(hostDir, guestDir) {
    super(hostDir, guestDir);
    try {
      this.create();
    } catch (e) {
      this.destroy();
      throw e;
    }
  }
}
// src/guest/job.ts
import { join } from "path";
var driverDirs = {
  cpp: "/app/drivers/cpp",
  python: "/app/drivers/python"
};

class Job {
  job;
  dir;
  stack = new AsyncDisposableStack;
  constructor(job, dir = null) {
    this.job = job;
    this.dir = dir;
  }
  get workdir() {
    return this.dir;
  }
  async create() {
    if (this.dir === null) {
      const tempDir = new TempDir;
      this.stack.use(tempDir);
      this.dir = tempDir.dir;
    } else {
      const directory2 = new RecursiveDir(this.dir);
      this.stack.use(directory2);
    }
    const driver = driverDirs[this.job.lang];
    if (driver) {
      const driverMount = new OverlayMount(driver, this.dir);
      this.stack.use(driverMount);
    }
    const zipPath = join(this.dir, `${this.job.id}.zip`);
    try {
      await Bun.write(zipPath, this.job.file);
    } catch (e) {
      throw new CrackedError("FS_WRITE", {
        message: "Failed to write file when creating new job",
        cause: e
      });
    }
    const cmd = ["unzip", zipPath];
    const proc = Bun.spawnSync(cmd, { timeout: 1000 });
    fsProcLogAndMaybeThrow(proc, cmd, "FS_UNZIP", `Failed to unzip file during job creation: ${zipPath}`);
  }
  async execute() {
    if (this.dir === null) {
      throw new CrackedError("UNINITIALIZED", {
        message: "Cannot execute a job that is uninitialized"
      });
    }
    const compileScript = join(this.dir, "compile.sh");
    const runScript = join(this.dir, "run.sh");
    if (fileExists(compileScript)) {
      const cmd = [`/bin/bash`, compileScript];
      const compileProc = Bun.spawnSync(cmd, { timeout: 30000 });
      fsProcLogAndMaybeThrow(compileProc, cmd, "GUEST_COMPILE_FAILED", "Found compile script but encountered error during execution");
    }
    if (fileExists(runScript)) {
      const cmd = [`/bin/bash`, runScript];
      const runProc = Bun.spawnSync(cmd, { timeout: 30000 });
      fsProcLogAndMaybeThrow(runProc, cmd, "GUEST_RUN_FAILED", "Found run script but encountered error during execution");
    } else {
      throw new CrackedError("GUEST_MALFORMED_JOB", {
        message: "No run script found in job directory."
      });
    }
  }
  async destroy() {
    await this.stack.disposeAsync();
  }
  async[Symbol.asyncDispose]() {
    await this.destroy();
  }
}
var createJob = async (...params) => {
  const j = new Job(...params);
  await j.create();
  return j;
};

// src/guest/index.ts
var main = async () => {
  while (true) {
    let __stack = [];
    try {
      await Bun.sleep(1000);
      console.log("waiting for job...");
      const { data, error } = await tryCatch(vmClient.requestJob());
      if (error) {
        console.error("Error:", error);
        await Bun.sleep(1000);
        continue;
      }
      if (!data) {
        continue;
      }
      const job = __using(__stack, await createJob(data), 1);
      await job.execute();
    } catch (_catch) {
      var _err = _catch, _hasErr = 1;
    } finally {
      var _promise = __callDispose(__stack, _err, _hasErr);
      _promise && await _promise;
    }
  }
};
main();
