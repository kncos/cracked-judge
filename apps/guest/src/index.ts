/* eslint-disable @typescript-eslint/no-explicit-any */
import { cleanup, init, run } from "./isolate/commands";
import type { IsolateResult } from "./isolate/types";

const testbin = "/srv/data/isolate-test-program";

const BOX_ID = 0;

/**
 * Minimal assertion helper
 */
function expect(actual: any) {
  return {
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected} but got ${actual}`);
      }
    },
    toBeGreaterThanOrEqual: (expected: number) => {
      if (!(actual >= expected)) {
        throw new Error(`Expected ${actual} to be >= ${expected}`);
      }
    },
    toBeLessThan: (expected: number) => {
      if (!(actual < expected)) {
        throw new Error(`Expected ${actual} to be < ${expected}`);
      }
    },
    toBeDefined: () => {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined`);
      }
    },
  };
}

function setup() {
  init(BOX_ID);
}

function teardown() {
  cleanup(BOX_ID);
}

// --- Test Functions ---
const printres = (input: IsolateResult) => {
  console.log(">>> STDOUT:");
  console.log(input.stdout.slice(0, 2048));
  console.log(">>> STDERR:");
  console.log(input.stdout.slice(0, 2048));
  console.log(">>> METADATA:");
  console.log(JSON.stringify(input.metadata, null, 2));
};

function testAcCleanZeroExit() {
  console.log("Starting: AC — clean zero exit");
  setup();
  const result = run({ cmd: [testbin, "--exitcode=0"], box_id: BOX_ID });
  try {
    expect(result.status).toBe("AC");
    expect(result.metadata.exitcode).toBe(0);
    expect(result.metadata.killed).toBe(false);
  } catch (e) {
    printres(result);
    throw e;
  }
  teardown();
}
function testWaReservedExitCode() {
  console.log("Starting: WA — reserved exit code 69");
  setup();
  const result = run({ cmd: [testbin, "--exitcode=69"], box_id: BOX_ID });
  try {
    expect(result.status).toBe("WA");
    expect(result.metadata.exitcode).toBe(69);
  } catch (e) {
    printres(result);
    throw e;
  }
  teardown();
}

function testReNonZeroExit() {
  console.log("Starting: RE — non-zero non-69 exit code");
  setup();
  const result = run({ cmd: [testbin, "--exitcode=1"], box_id: BOX_ID });
  try {
    expect(result.status).toBe("RE");
    expect(result.metadata.status).toBe("RE");
    expect(result.metadata.exitcode).toBe(1);
  } catch (e) {
    printres(result);
    throw e;
  }
  teardown();
}

function testReUnhandledException() {
  console.log("Starting: RE — unhandled exception (panic)");
  setup();
  const result = run({ cmd: [testbin, "--throw"], box_id: BOX_ID });
  try {
    expect(result.status).toBe("RE");
  } catch (e) {
    printres(result);
    throw e;
  }
  teardown();
}

function testReSegfault() {
  console.log("Starting: RE — segfault (SIGSEGV)");
  setup();
  const result = run({ cmd: [testbin, "--exitsig=11"], box_id: BOX_ID });
  try {
    expect(result.status).toBe("RE");
    expect(result.metadata.status).toBe("SG");
    expect(result.metadata.exitsig).toBeDefined();
  } catch (e) {
    printres(result);
    throw e;
  }
  teardown();
}

function testTleCpu() {
  console.log("Starting: TLE — CPU time limit exceeded");
  setup();
  const result = run({
    cmd: [testbin, "--time=5"],
    time: 1,
    box_id: BOX_ID,
  });
  try {
    expect(result.status).toBe("TLE");
    expect(result.metadata.status).toBe("TO");
    expect(result.metadata.killed).toBe(true);
    expect(result.metadata.time).toBeGreaterThanOrEqual(1);
  } catch (e) {
    printres(result);
    throw e;
  }
  teardown();
}

function testTleWall() {
  console.log("Starting: TLE — wall clock time limit exceeded");
  setup();
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
  teardown();
}

function testMleCgroup() {
  console.log("Starting: MLE — exceeds cgroup memory limit");
  setup();
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
  teardown();
}

function testOleStdout() {
  console.log("Starting: OLE — stdout exceeds fsize limit");
  setup();
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
  teardown();
}

function testOleFile() {
  console.log("Starting: OLE — file write exceeds fsize limit");
  setup();
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
  teardown();
}

/**
 * Sequential runner
 */
function runAllTests() {
  const tests = [
    testAcCleanZeroExit,
    testWaReservedExitCode,
    testReNonZeroExit,
    testReUnhandledException,
    testReSegfault,
    testTleCpu,
    testTleWall,
    testMleCgroup,
    testOleStdout,
    testOleFile,
  ];

  for (const testFn of tests) {
    try {
      testFn();
    } catch (err) {
      console.error(`Test Failed: ${err}`);
    }
  }

  console.log("----- TESTS COMPLETE -----");
}

runAllTests();
