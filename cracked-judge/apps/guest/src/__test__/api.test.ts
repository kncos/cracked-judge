/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { WorkerClient } from "@cracked-judge/common/contract";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { prepareJob } from "../job";
import { createMockServer } from "./mock-server";

describe("api test w/ mock server", () => {
  let resources: AsyncDisposableStack;
  let client: typeof WorkerClient.prototype.client;

  beforeEach(async () => {
    resources = new AsyncDisposableStack();
    try {
      const server = await createMockServer();
      resources.use(server);
      const wc = await WorkerClient.create();
      resources.use(wc);
      client = wc.client;
    } catch (e) {
      await resources.disposeAsync();
      throw e;
    }
  });

  afterEach(async () => {
    await resources.disposeAsync();
  });

  it("mock server works", async () => {
    const res = await client.check();
    expect(res.ok).toBe(true);
  });

  it("job setup", async () => {
    const job = await client.request();
    expect(job).not.toBeNull();
    const setupRes = await prepareJob(job!);
    expect(setupRes.success).toBe(true);
  });
});
