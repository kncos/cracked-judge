import { WorkerClient, type zJob } from "@cracked-judge/common/contract";
import { beforeEach, describe, expect, it } from "bun:test";
import Redis from "ioredis";
import { afterEach } from "node:test";
import type z from "zod";
import { CrackedJudgeServer } from "..";
import { judgeClient } from "../client";
import { serverLogger } from "../lib/logger";

const someFileContent =
  "the quick brown fox jumps over the lazy dog.\n" +
  "🚀 Sparkle: ✨ | UTF-8: ⚡ | Kanji: 漢字 | Arabic: السلام | Math: π ≈ 3.14 | Hidden: ZWJJoiner";

describe("basic interaction works", () => {
  let resources: AsyncDisposableStack | null;

  beforeEach(async () => {
    resources = new AsyncDisposableStack();
    const redis = new Redis();
    await redis.flushall();
    const server = await CrackedJudgeServer.create();
    resources.use(server);
  });

  afterEach(async () => {
    if (resources) {
      await resources.disposeAsync();
    }
  });

  it.skip("server responds", async () => {
    const check = await judgeClient.check();
    expect(check.ok).toBe(true);
  });

  it("server responds to worker", async () => {
    using wc = await WorkerClient.create("ws://localhost:3000");
    const client = wc.client;
    const check = await client.check();
    expect(check.ok).toBe(true);
  });

  it.skip("user request -> worker consume -> worker submit -> user response", async () => {
    using wc = await WorkerClient.create("ws://localhost:3000");
    const workerClient = wc.client;

    const workerSide = async () => {
      const start = Date.now();
      // can technically be null
      serverLogger.info("WORKER: test started");
      const res = (await workerClient.request()) as z.infer<typeof zJob>;
      serverLogger.info("WORKER: response received");
      // 30s cooldown should be fine
      expect(res).not.toBeNull();
      const fileData = await res.files.arrayBuffer();
      const stdout = new TextDecoder("utf-8").decode(fileData);

      await workerClient.submit({
        id: res.id,
        message: "worker has submitted",
        status: "AC",
        runtimeResult: {
          meta: {
            cg_mem: 256,
            max_rss: 256,
            time: Date.now() - start,
            time_wall: 128,
            csw_forced: 0,
            csw_voluntary: 0,
          },
          stdout,
          stderr: "",
        },
      });
    };

    const userSide = async () => {
      serverLogger.info("USER: test started");
      const res = await judgeClient.submit({
        files: new File([Buffer.from(someFileContent)], "files"),
      });
      serverLogger.info("USER: response received");
      expect(res.status).toBe("AC");
      expect(res.stdout).toBe(someFileContent);
    };

    await Promise.all([workerSide(), userSide()]);
  });
});
