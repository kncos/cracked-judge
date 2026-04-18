import { WorkerClient } from "@cracked-judge/common/contract";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createMockServer } from "./mock-server";

describe("api test w/ mock server", () => {
  let resources: AsyncDisposableStack;

  beforeEach(async () => {
    resources = new AsyncDisposableStack();
    const server = await createMockServer();
    resources.use(server);
  });

  afterEach(async () => {
    await resources.disposeAsync();
  });

  it("mock server works", async () => {
    using wc = await WorkerClient.create();
    const client = wc.client;
    const res = await client.check();
    expect(res.ok).toBe(true);
  });
});
