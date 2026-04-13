import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, init, run } from "../isolate/commands";
import type { IsolateResult } from "../isolate/types";

const testbin = "/run/current-system/sw/bin/isolate-test-program";
const BOX_ID = 0;

const printres = (input: IsolateResult) => {
  console.log(">>> STDOUT:");
  console.log(input.stdout.slice(0, 2048));
  console.log(">>> STDERR:");
  console.log(input.stderr.slice(0, 2048));
  console.log(">>> METADATA:");
  console.log(JSON.stringify(input.metadata, null, 2));
};

describe("Judge Status Results", () => {
  beforeEach(() => {
    init(BOX_ID);
  });

  afterEach(() => {
    cleanup(BOX_ID);
  });

  it("AC — clean zero exit", () => {
    const result = run({ cmd: [testbin, "--exitcode=0"], box_id: BOX_ID });
    try {
      expect(result.status).toBe("AC");
      expect(result.metadata.exitcode).toBe(0);
      expect(result.metadata.killed).toBe(false);
    } catch (e) {
      printres(result);
      throw e;
    }
  });

  it("WA — reserved exit code 69", () => {
    const result = run({ cmd: [testbin, "--exitcode=69"], box_id: BOX_ID });
    try {
      expect(result.status).toBe("WA");
      expect(result.metadata.exitcode).toBe(69);
    } catch (e) {
      printres(result);
      throw e;
    }
  });

  it("RE — non-zero non-69 exit code", () => {
    const result = run({ cmd: [testbin, "--exitcode=1"], box_id: BOX_ID });
    try {
      expect(result.status).toBe("RE");
      expect(result.metadata.status).toBe("RE");
      expect(result.metadata.exitcode).toBe(1);
    } catch (e) {
      printres(result);
      throw e;
    }
  });

  it("RE — unhandled exception (panic)", () => {
    const result = run({ cmd: [testbin, "--throw"], box_id: BOX_ID });
    try {
      expect(result.status).toBe("RE");
    } catch (e) {
      printres(result);
      throw e;
    }
  });

  it("RE — segfault (SIGSEGV)", () => {
    const result = run({ cmd: [testbin, "--exitsig=11"], box_id: BOX_ID });
    try {
      expect(result.status).toBe("RE");
      expect(result.metadata.status).toBe("SG");
      expect(result.metadata.exitsig).toBeDefined();
    } catch (e) {
      printres(result);
      throw e;
    }
  });

  it("TLE — CPU time limit exceeded", () => {
    const result = run({ cmd: [testbin, "--time=5"], time: 1, box_id: BOX_ID });
    try {
      expect(result.status).toBe("TLE");
      expect(result.metadata.status).toBe("TO");
      expect(result.metadata.killed).toBe(true);
      expect(result.metadata.time).toBeGreaterThanOrEqual(1);
    } catch (e) {
      printres(result);
      throw e;
    }
  });

  it("TLE — wall clock time limit exceeded", () => {
    const result = run({
      cmd: [testbin, "--sleep=5"],
      wall_time: 1,
      box_id: BOX_ID,
    });
    try {
      expect(result.status).toBe("TLE");
      expect(result.metadata.status).toBe("TO");
      expect(result.metadata.killed).toBe(true);
      expect(result.metadata.time_wall).toBeGreaterThanOrEqual(1);
      expect(result.metadata.time).toBeLessThan(0.5);
    } catch (e) {
      printres(result);
      throw e;
    }
  });

  it("MLE — exceeds cgroup memory limit", () => {
    const result = run({
      cmd: [testbin, "--memory=256"],
      cg_mem: 65536,
      box_id: BOX_ID,
    });
    try {
      expect(result.status).toBe("MLE");
      expect(result.metadata.cg_oom_killed).toBe(true);
    } catch (e) {
      printres(result);
      throw e;
    }
  });

  it("OLE — stdout exceeds fsize limit", () => {
    const result = run({
      cmd: [testbin, "--write=64,stdout"],
      fsize: 1024,
      box_id: BOX_ID,
    });
    try {
      expect(result.status).toBe("OLE");
      expect(result.metadata.status).toBe("SG");
      expect(result.metadata.exitsig).toBeDefined();
    } catch (e) {
      printres(result);
      throw e;
    }
  });

  it("OLE — file write exceeds fsize limit", () => {
    const result = run({
      cmd: [testbin, "--write=64,out.bin"],
      fsize: 1024,
      box_id: BOX_ID,
    });
    try {
      expect(result.status).toBe("OLE");
      expect(result.metadata.status).toBe("SG");
      expect(result.metadata.exitsig).toBeDefined();
    } catch (e) {
      printres(result);
      throw e;
    }
  });
});
