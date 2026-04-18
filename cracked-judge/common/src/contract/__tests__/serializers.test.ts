/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, it } from "bun:test";
import type z from "zod";
import {
  deserializeJob,
  deserializeJobResult,
  serializeJob,
  serializeJobResult,
} from "../serializers";
import { zJob, zJobResult } from "../types";

const someFileContent =
  "the quick brown fox jumps over the lazy dog.\n" +
  "🚀 Sparkle: ✨ | UTF-8: ⚡ | Kanji: 漢字 | Arabic: السلام | Math: π ≈ 3.14 | Hidden: ZWJJoiner";

describe("contract serializer tests", () => {
  it("zJob: serialize & deserialize", async () => {
    const files = new File([Buffer.from(someFileContent)], "files");
    const job = zJob.parse({
      id: "n/a",
      files,
      isolateOpts: {
        cmd: ["/bin/sh", "-c", '"sleep 1"'],
      },
      returnPayload: true,
    } satisfies z.input<typeof zJob>);
    const serialized = await serializeJob(job);
    const deserialized = deserializeJob(serialized);

    const prevHash = await crypto.subtle.digest(
      "SHA-256",
      await files.arrayBuffer(),
    );

    const finalHash = await crypto.subtle.digest(
      "SHA-256",
      await deserialized.files.arrayBuffer(),
    );

    expect(prevHash).toEqual(finalHash);
    const { files: _prevFile, ...prevProps } = job;
    const { files: _finalFile, ...finalProps } = deserialized;
    expect(prevProps).toEqual(finalProps);
  });

  it("zJobResult: serialize & deserialize", async () => {
    const payload = new File([Buffer.from(someFileContent)], "files");
    const jobResult = zJobResult.parse({
      id: "n/a",
      message: "zJobResult: serialize & deserialize test",
      status: "AC",
      payload,
    } satisfies z.input<typeof zJobResult>);
    const serialized = await serializeJobResult(jobResult);
    const deserialized = deserializeJobResult(serialized);

    const prevHash = await crypto.subtle.digest(
      "SHA-256",
      await payload.arrayBuffer(),
    );

    expect(deserialized.payload).toBeDefined();

    const finalHash = await crypto.subtle.digest(
      "SHA-256",
      await deserialized.payload!.arrayBuffer(),
    );

    expect(prevHash).toEqual(finalHash);
    const { payload: _prevPayload, ...prevProps } = jobResult;
    const { payload: _finalPayload, ...finalProps } = deserialized;
    expect(prevProps).toEqual(finalProps);
  });
});
