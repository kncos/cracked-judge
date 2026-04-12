import { describe, expect, test } from "bun:test";
import path from "path";
import { cleanup, init, run } from "../isolate/commands";

import { afterEach, beforeEach } from "bun:test";

const testbin = "/srv/data/testbin";
const bins = {
  bigFile: path.join(testbin, "big-file"),
  bigStdout: path.join(testbin, "big-stdout"),
  exitCode: path.join(testbin, "exit-code"),
  mle: path.join(testbin, "mle"),
  segfault: path.join(testbin, "segfault"),
  stderr: path.join(testbin, "stderr"),
  stdout: path.join(testbin, "stdout"),
  tle: path.join(testbin, "tle"),
  unhandledEx: path.join(testbin, "unhandled-ex"),
  wallTle: path.join(testbin, "wall-tle"),
} as const;

const BOX_ID = 0;

describe("JudgeStatus", () => {
  beforeEach(() => {
    init(BOX_ID);
  });

  afterEach(() => {
    cleanup(BOX_ID);
  });

  test("AC — clean zero exit", () => {
    const result = run({ cmd: [bins.exitCode, "0"], box_id: BOX_ID });
    expect(result.status).toBe("AC");
    expect(result.metadata.exitcode).toBe(0);
    expect(result.metadata.killed).toBe(false);
  });

  test("WA — reserved exit code 69", () => {
    const result = run({ cmd: [bins.exitCode, "69"], box_id: BOX_ID });
    expect(result.status).toBe("WA");
    expect(result.metadata.exitcode).toBe(69);
  });

  test("RE — non-zero non-69 exit code", () => {
    const result = run({ cmd: [bins.exitCode, "1"], box_id: BOX_ID });
    expect(result.status).toBe("RE");
    expect(result.metadata.status).toBe("RE");
    expect(result.metadata.exitcode).toBe(1);
  });

  test("RE — unhandled C++ exception (calls std::terminate, exit 134)", () => {
    const result = run({ cmd: [bins.unhandledEx], box_id: BOX_ID });
    expect(result.status).toBe("RE");
  });

  test("RE — segfault (SIGSEGV)", () => {
    const result = run({ cmd: [bins.segfault], box_id: BOX_ID });
    // segfault comes through as SG with SIGSEGV, which interpretMeta maps to RE
    expect(result.status).toBe("RE");
    expect(result.metadata.status).toBe("SG");
    expect(result.metadata.exitsig).toBeDefined();
  });

  test("TLE — CPU time limit exceeded", () => {
    const result = run({
      cmd: [bins.tle, "5"],
      time: 1,
      box_id: BOX_ID,
    });
    expect(result.status).toBe("TLE");
    expect(result.metadata.status).toBe("TO");
    expect(result.metadata.killed).toBe(true);
    // actual cpu time should be at or just over the 1s limit
    expect(result.metadata.time).toBeGreaterThanOrEqual(1);
  });

  test("TLE — wall clock time limit exceeded (sleeping process)", () => {
    const result = run({
      cmd: [bins.wallTle, "5"],
      wall_time: 1,
      box_id: BOX_ID,
    });
    expect(result.status).toBe("TLE");
    expect(result.metadata.status).toBe("TO");
    expect(result.metadata.killed).toBe(true);
    expect(result.metadata.time_wall).toBeGreaterThanOrEqual(1);
    // cpu time should be near zero since the process was just sleeping
    expect(result.metadata.time).toBeLessThan(0.5);
  });

  test("MLE — exceeds cgroup memory limit", () => {
    const result = run({
      // try to alloc 256 MiB, limit to 64 MiB
      cmd: [bins.mle, "256"],
      cg_mem: 65536,
      box_id: BOX_ID,
    });
    expect(result.status).toBe("MLE");
    expect(result.metadata.cg_oom_killed).toBe(true);
  });

  test("OLE — stdout exceeds fsize limit", () => {
    const result = run({
      // try to write 64 MiB to stdout, limit to 1 MiB
      cmd: [bins.bigStdout, "64"],
      // KiB
      fsize: 1024,
      box_id: BOX_ID,
    });
    expect(result.status).toBe("OLE");
    expect(result.metadata.status).toBe("SG");
    // isolate kills the process with SIGXFSZ when fsize is exceeded
    expect(result.metadata.exitsig).toBeDefined();
  });

  test("OLE — file write exceeds fsize limit", () => {
    const result = run({
      // try to write 64 MiB to a file, limit to 1 MiB
      cmd: [bins.bigFile, "64"],
      // KiB
      fsize: 1024,
      box_id: BOX_ID,
    });
    expect(result.status).toBe("OLE");
    expect(result.metadata.status).toBe("SG");
    expect(result.metadata.exitsig).toBeDefined();
  });
});
