/* eslint-disable @typescript-eslint/no-explicit-any */

import path from "path";
import { cleanup, init, run } from "./isolate/commands";

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

function testAcCleanZeroExit() {
  console.log("Starting: AC — clean zero exit");
  setup();
  const result = run({ cmd: [bins.exitCode, "0"], box_id: BOX_ID });
  expect(result.status).toBe("AC");
  expect(result.metadata.exitcode).toBe(0);
  expect(result.metadata.killed).toBe(false);
  teardown();
}

function testWaReservedExitCode() {
  console.log("Starting: WA — reserved exit code 69");
  setup();
  const result = run({ cmd: [bins.exitCode, "69"], box_id: BOX_ID });
  expect(result.status).toBe("WA");
  expect(result.metadata.exitcode).toBe(69);
  teardown();
}

function testReNonZeroExit() {
  console.log("Starting: RE — non-zero non-69 exit code");
  setup();
  const result = run({ cmd: [bins.exitCode, "1"], box_id: BOX_ID });
  expect(result.status).toBe("RE");
  expect(result.metadata.status).toBe("RE");
  expect(result.metadata.exitcode).toBe(1);
  teardown();
}

function testReUnhandledException() {
  console.log("Starting: RE — unhandled C++ exception");
  setup();
  const result = run({ cmd: [bins.unhandledEx], box_id: BOX_ID });
  expect(result.status).toBe("RE");
  teardown();
}

function testReSegfault() {
  console.log("Starting: RE — segfault (SIGSEGV)");
  setup();
  const result = run({ cmd: [bins.segfault], box_id: BOX_ID });
  expect(result.status).toBe("RE");
  expect(result.metadata.status).toBe("SG");
  expect(result.metadata.exitsig).toBeDefined();
  teardown();
}

function testTleCpu() {
  console.log("Starting: TLE — CPU time limit exceeded");
  setup();
  const result = run({
    cmd: [bins.tle, "5"],
    time: 1,
    box_id: BOX_ID,
  });
  expect(result.status).toBe("TLE");
  expect(result.metadata.status).toBe("TO");
  expect(result.metadata.killed).toBe(true);
  expect(result.metadata.time).toBeGreaterThanOrEqual(1);
  teardown();
}

function testTleWall() {
  console.log("Starting: TLE — wall clock time limit exceeded");
  setup();
  const result = run({
    cmd: [bins.wallTle, "5"],
    wall_time: 1,
    box_id: BOX_ID,
  });
  expect(result.status).toBe("TLE");
  expect(result.metadata.status).toBe("TO");
  expect(result.metadata.killed).toBe(true);
  expect(result.metadata.time_wall).toBeGreaterThanOrEqual(1);
  expect(result.metadata.time).toBeLessThan(0.5);
  teardown();
}

function testMleCgroup() {
  console.log("Starting: MLE — exceeds cgroup memory limit");
  setup();
  const result = run({
    cmd: [bins.mle, "256"],
    cg_mem: 65536,
    box_id: BOX_ID,
  });
  expect(result.status).toBe("MLE");
  expect(result.metadata.cg_oom_killed).toBe(true);
  teardown();
}

function testOleStdout() {
  console.log("Starting: OLE — stdout exceeds fsize limit");
  setup();
  const result = run({
    cmd: [bins.bigStdout, "64"],
    fsize: 1024,
    box_id: BOX_ID,
  });
  expect(result.status).toBe("OLE");
  expect(result.metadata.status).toBe("SG");
  expect(result.metadata.exitsig).toBeDefined();
  teardown();
}

function testOleFile() {
  console.log("Starting: OLE — file write exceeds fsize limit");
  setup();
  const result = run({
    cmd: [bins.bigFile, "64"],
    fsize: 1024,
    box_id: BOX_ID,
  });
  expect(result.status).toBe("OLE");
  expect(result.metadata.status).toBe("SG");
  expect(result.metadata.exitsig).toBeDefined();
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

// const main = async () => {
//   while (true) {
//     await Bun.sleep(1000);
//     console.log("waiting for job...");
//     const { data, error } = await tryCatch(vmClient.requestJob());
//     if (error) {
//       console.error("Error:", error);
//       await Bun.sleep(1000);
//       continue;
//     }
//
//     if (!data) {
//       continue;
//     }
//
//     // await using job = await createJob(data);
//     // await job.execute();
//
//     await tryCatch(
//       vmClient.submitJobResult({
//         id: data.id,
//         type: "result",
//         status: "accepted",
//         memoryKb: 256,
//         runtimeMs: 256,
//         stderr: "",
//         stdout: "hello from VM!",
//       }),
//     );
//   }
// };
//
// void main();
//
