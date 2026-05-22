import { describe, expect, it } from "bun:test";
import type z from "zod";
import type { zJob } from "../../db/types";
import { deserializeJob, serializeJob } from "../serializers";

const someFileContent =
  "the quick brown fox jumps over the lazy dog.\n" +
  "🚀 Sparkle: ✨ | UTF-8: ⚡ | Kanji: 漢字 | Arabic: السلام | Math: π ≈ 3.14 | Hidden: ZWJJoiner";

type Job = z.infer<typeof zJob>;

const baseStep: Job["steps"][0] = {
  cmd: ["echo", "hello"],
  isolateOpts: {
    time: 1.5,
    cg_mem: 65536,
    wall_time: 2.0,
  },
  dependencyUrls: ["https://example.com/dep.tar.gz"],
};

describe("contract serializer tests", () => {
  it("zJob: serialize & deserialize (no files)", async () => {
    const job: Job = {
      id: "job-no-files",
      type: "generic",
      steps: [baseStep],
    };

    const serialized = await serializeJob(job);
    const deserialized = deserializeJob(serialized);

    expect(deserialized.id).toBe(job.id);
    expect(deserialized.steps).toHaveLength(1);

    const step = deserialized.steps[0];
    expect(step?.cmd).toEqual(baseStep.cmd);
    expect(step?.isolateOpts).toEqual(baseStep.isolateOpts);
    expect(step?.dependencyUrls).toEqual(baseStep.dependencyUrls);
    expect(step?.tarball).toBeUndefined();
  });

  it("zJob: serialize & deserialize (with files)", async () => {
    const files = new File([Buffer.from(someFileContent)], "files");
    const job: Job = {
      id: "job-with-files",
      type: "generic",
      steps: [{ ...baseStep, tarball: files }],
    };

    const serialized = await serializeJob(job);
    const deserialized = deserializeJob(serialized);

    expect(deserialized.id).toBe(job.id);

    const step = deserialized.steps[0];
    expect(step?.tarball).toBeInstanceOf(File);
    // deserializeJob hardcodes the reconstructed filename
    expect(step?.tarball?.name).toBe("files.tar");

    const roundTrippedContent = await step?.tarball?.text();
    expect(roundTrippedContent).toBe(someFileContent);
  });

  it("zJob: serialize & deserialize (multiple steps, mixed files)", async () => {
    const files = new File([Buffer.from(someFileContent)], "files");
    const job: Job = {
      id: "job-multi-step",
      type: "generic",
      steps: [
        { ...baseStep, tarball: files },
        {
          cmd: ["python3", "solution.py"],
          isolateOpts: { time: 2.0, cg_mem: 131072 },
          dependencyUrls: [],
          uploadUrl: "https://example.com/upload",
          // no files on this step
        },
      ],
    };

    const serialized = await serializeJob(job);
    const deserialized = deserializeJob(serialized);

    expect(deserialized.id).toBe("job-multi-step");
    expect(deserialized.steps).toHaveLength(2);

    expect(deserialized?.steps[0]?.tarball).toBeInstanceOf(File);
    expect(deserialized?.steps[1]?.tarball).toBeUndefined();
    expect(deserialized?.steps[1]?.uploadUrl).toBe(
      "https://example.com/upload",
    );
  });

  it("zJob: serialized output is a Buffer/Uint8Array", async () => {
    const job: Job = {
      id: "job-buffer-check",
      type: "generic",
      steps: [baseStep],
    };

    const serialized = await serializeJob(job);
    expect(serialized).toBeInstanceOf(Buffer);
  });

  it("zJob: deserialize throws on garbage input", () => {
    expect(() => deserializeJob(Buffer.from("not msgpack data"))).toThrow();
  });
});
