// handleJob.test.ts
import type { zJob, zJobResult } from "@cracked-judge/common/contract";
import { describe, expect, test } from "bun:test";
import { createTar } from "nanotar";
import type { z } from "zod";
import { handleJob } from "../job";

type Job = z.infer<typeof zJob>;
type JobResult = z.infer<typeof zJobResult>;

/** Wraps a nanotar Uint8Array in a Bun File for use in zJobStep.files */
function tarToFile(data: Uint8Array, name = "payload.tar"): File {
  return new File([data], name, { type: "application/x-tar" });
}

/**
 * Builds a tar containing a single shell script, then returns a File.
 * The script is placed at /box/run.sh inside the sandbox.
 */
function scriptTar(script: string): File {
  const data = createTar([{ name: "run.sh", data: script }]);
  return tarToFile(data);
}

const BASE_ISOLATE_OPTS = {
  time: 5,
  wall_time: 10,
  cg_mem: 65536, // 64 MiB
} as const;

let BOX_COUNTER = 0;
/** Each test gets its own box_id to allow parallelism */
function nextBoxId() {
  return BOX_COUNTER++;
}

describe("handleJob — single step", () => {
  test("runs a trivial echo command", async () => {
    const job: Job = {
      id: "test-echo",
      steps: [
        {
          cmd: ["/bin/sh", "-c", "echo hello"],
          isolateOpts: { ...BASE_ISOLATE_OPTS, box_id: nextBoxId() },
          dependencyUrls: [],
          files: undefined,
        },
      ],
    };

    const result: JobResult = await handleJob(job);

    expect(result.id).toBe("test-echo");
    expect(result.success).toBe(true);
    expect(result.stepResults).toHaveLength(1);
    expect(result?.stepResults[0]?.stdout.trim()).toBe("hello");
    expect(result?.stepResults[0]?.stderr).toBe("");
  });

  test("captures stderr separately from stdout", async () => {
    const job: Job = {
      id: "test-stderr",
      steps: [
        {
          cmd: ["/bin/sh", "-c", "echo out; echo err >&2"],
          isolateOpts: { ...BASE_ISOLATE_OPTS, box_id: nextBoxId() },
          dependencyUrls: [],
        },
      ],
    };

    const result = await handleJob(job);

    expect(result.success).toBe(true);
    expect(result.stepResults[0]?.stdout.trim()).toBe("out");
    expect(result.stepResults[0]?.stderr.trim()).toBe("err");
  });

  test("marks job failed when process exits non-zero", async () => {
    const job: Job = {
      id: "test-nonzero",
      steps: [
        {
          cmd: ["/bin/sh", "-c", "exit 1"],
          isolateOpts: { ...BASE_ISOLATE_OPTS, box_id: nextBoxId() },
          dependencyUrls: [],
        },
      ],
    };

    const result = await handleJob(job);

    expect(result.success).toBe(false);
    // RE = runtime error (non-zero exit)
    expect(result.stepResults[0]?.meta.status).toBe("RE");
    expect(result.stepResults[0]?.meta.exitcode).toBe(1);
  });

  test("meta contains plausible timing fields", async () => {
    const job: Job = {
      id: "test-meta",
      steps: [
        {
          cmd: ["/bin/sh", "-c", "echo hi"],
          isolateOpts: { ...BASE_ISOLATE_OPTS, box_id: nextBoxId() },
          dependencyUrls: [],
        },
      ],
    };

    const result = await handleJob(job);
    const meta = result.stepResults[0]?.meta;

    expect(meta?.time).toBeGreaterThanOrEqual(0);
    expect(meta?.time_wall).toBeGreaterThanOrEqual(0);
    // killed/oom should be false for a clean exit
    expect(meta?.killed).toBe(false);
    expect(meta?.cg_oom_killed).toBe(false);
  });
});

describe("handleJob — file extraction", () => {
  test("extracts a tarball and can execute a script from it", async () => {
    const script = "#!/bin/sh\necho from_script";
    const job: Job = {
      id: "test-file-exec",
      steps: [
        {
          cmd: ["/bin/sh", "/box/run.sh"],
          isolateOpts: { ...BASE_ISOLATE_OPTS, box_id: nextBoxId() },
          dependencyUrls: [],
          files: scriptTar(script),
        },
      ],
    };

    const result = await handleJob(job);

    expect(result.success).toBe(true);
    expect(result.stepResults[0]?.stdout.trim()).toBe("from_script");
  });

  test("extracts multiple files from a single tarball", async () => {
    const tar = createTar([
      { name: "a.txt", data: "aaa" },
      { name: "b.txt", data: "bbb" },
      // script reads both files and prints them
      { name: "run.sh", data: "cat /box/a.txt /box/b.txt" },
    ]);

    const job: Job = {
      id: "test-multi-file",
      steps: [
        {
          cmd: ["/bin/sh", "/box/run.sh"],
          isolateOpts: { ...BASE_ISOLATE_OPTS, box_id: nextBoxId() },
          dependencyUrls: [],
          files: tarToFile(tar),
        },
      ],
    };

    const result = await handleJob(job);

    expect(result.success).toBe(true);
    expect(result.stepResults[0]?.stdout).toBe("aaabbb");
  });

  test("file content is accessible at expected sandbox path", async () => {
    const tar = createTar([{ name: "data.txt", data: "sentinel_value\n" }]);

    const job: Job = {
      id: "test-file-path",
      steps: [
        {
          cmd: ["/bin/sh", "-c", "cat /box/data.txt"],
          isolateOpts: { ...BASE_ISOLATE_OPTS, box_id: nextBoxId() },
          dependencyUrls: [],
          files: tarToFile(tar),
        },
      ],
    };

    const result = await handleJob(job);

    expect(result.success).toBe(true);
    expect(result.stepResults[0]?.stdout.trim()).toBe("sentinel_value");
  });

  test("fails cleanly when script has a syntax error", async () => {
    const job: Job = {
      id: "test-syntax-error",
      steps: [
        {
          cmd: ["/bin/sh", "/box/run.sh"],
          isolateOpts: { ...BASE_ISOLATE_OPTS, box_id: nextBoxId() },
          dependencyUrls: [],
          files: scriptTar("this is not valid sh syntax }{"),
        },
      ],
    };

    const result = await handleJob(job);

    expect(result.success).toBe(false);
    expect(result.stepResults[0]?.meta.exitcode).not.toBe(0);
  });
});

describe("handleJob — multi-step", () => {
  test("executes all steps in order when all succeed", async () => {
    // Each step writes to stderr so we can observe ordering
    const makeStep = (label: string, boxId: number) => ({
      cmd: ["/bin/sh", "-c", `echo step_${label}`],
      isolateOpts: { ...BASE_ISOLATE_OPTS, box_id: boxId },
      dependencyUrls: [] as string[],
    });

    const job: Job = {
      id: "test-multi-step-ok",
      steps: [
        makeStep("a", nextBoxId()),
        makeStep("b", nextBoxId()),
        makeStep("c", nextBoxId()),
      ],
    };

    const result = await handleJob(job);

    expect(result.success).toBe(true);
    expect(result.stepResults).toHaveLength(3);
    expect(result.stepResults[0]?.stdout.trim()).toBe("step_a");
    expect(result.stepResults[1]?.stdout.trim()).toBe("step_b");
    expect(result.stepResults[2]?.stdout.trim()).toBe("step_c");
  });

  test("stops at first failed step and does not run subsequent steps", async () => {
    const job: Job = {
      id: "test-multi-step-fail",
      steps: [
        {
          cmd: ["/bin/sh", "-c", "echo step1"],
          isolateOpts: { ...BASE_ISOLATE_OPTS, box_id: nextBoxId() },
          dependencyUrls: [],
        },
        {
          // this step fails
          cmd: ["/bin/sh", "-c", "exit 1"],
          isolateOpts: { ...BASE_ISOLATE_OPTS, box_id: nextBoxId() },
          dependencyUrls: [],
        },
        {
          // this step should never run
          cmd: ["/bin/sh", "-c", "echo step3"],
          isolateOpts: { ...BASE_ISOLATE_OPTS, box_id: nextBoxId() },
          dependencyUrls: [],
        },
      ],
    };

    const result = await handleJob(job);

    expect(result.success).toBe(false);
    // Only 2 results — step 3 was never executed
    expect(result.stepResults).toHaveLength(2);
    expect(result.stepResults[0]?.stdout.trim()).toBe("step1");
    expect(result.stepResults[1]?.meta.status).toBe("RE");
  });

  test("compile-then-run pattern: output of step 1 is available in step 2", async () => {
    // step 1: compile a trivial C program
    // step 2: run the compiled binary
    // Both steps share the same box_id so the filesystem is shared
    const sharedBoxId = nextBoxId();

    const compileSrc = createTar([
      {
        name: "main.c",
        data: `#include <stdio.h>\nint main(){printf("compiled_output\\n");return 0;}`,
      },
      {
        name: "compile.sh",
        data: "gcc /box/main.c -o /box/main",
      },
    ]);

    const job: Job = {
      id: "test-compile-run",
      steps: [
        {
          // compile step
          cmd: ["/bin/sh", "/box/compile.sh"],
          isolateOpts: { ...BASE_ISOLATE_OPTS, box_id: sharedBoxId },
          dependencyUrls: [],
          files: tarToFile(compileSrc),
        },
        {
          // run step — no new files, binary already in box
          cmd: ["/box/main"],
          isolateOpts: { ...BASE_ISOLATE_OPTS, box_id: sharedBoxId },
          dependencyUrls: [],
        },
      ],
    };

    const result = await handleJob(job);

    expect(result.success).toBe(true);
    expect(result.stepResults).toHaveLength(2);
    expect(result.stepResults[1]?.stdout.trim()).toBe("compiled_output");
  });
});

describe("handleJob — resource limits", () => {
  test("kills a process that exceeds the time limit (TO)", async () => {
    const job: Job = {
      id: "test-timeout",
      steps: [
        {
          cmd: ["/bin/sh", "-c", "while true; do :; done"],
          isolateOpts: {
            ...BASE_ISOLATE_OPTS,
            time: 1,
            wall_time: 2,
            box_id: nextBoxId(),
          },
          dependencyUrls: [],
        },
      ],
    };

    const result = await handleJob(job);

    expect(result.success).toBe(false);
    expect(result.stepResults[0]?.meta.status).toBe("TO");
    expect(result.stepResults[0]?.meta.killed).toBe(true);
  });

  test("kills a process that exceeds the memory limit (OOM)", async () => {
    // Tries to allocate ~256 MiB with `dd` into a tmpfs — with cg_mem capped at 64 MiB this should OOM
    const job: Job = {
      id: "test-oom",
      steps: [
        {
          cmd: [
            "/bin/sh",
            "-c",
            "dd if=/dev/zero bs=1M count=256 | cat > /dev/null",
          ],
          isolateOpts: {
            ...BASE_ISOLATE_OPTS,
            cg_mem: 32768, // 32 MiB hard cap
            time: 5,
            wall_time: 10,
            box_id: nextBoxId(),
          },
          dependencyUrls: [],
        },
      ],
    };

    const result = await handleJob(job);

    expect(result.success).toBe(false);
    expect(result.stepResults[0]?.meta.cg_oom_killed).toBe(true);
  });
});
