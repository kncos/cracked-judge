import { CrackedError } from "@cracked-judge/common";
import { zJob } from "@cracked-judge/common/contract";
import z from "zod";
import { publicRoute } from "../orpc";

export const user = publicRoute.user.router({
  submit: publicRoute.user.submit.handler(async ({ context, input }) => {
    const id = crypto.randomUUID();
    const job = zJob.parse({
      id,
      files: input.files,
      isolateOpts: {
        cmd: ["/bin/sh", "-c", '"ls -laR"'],
      },
    } as z.input<typeof zJob>);

    const { redisManager } = context;
    await redisManager.enqueueJob(job);
    const res = await redisManager.dequeueJobResult(30);
    if (res === null) {
      return {
        id,
        status: "IE",
        message: "Timed Out",
        stderr: "",
        stdout: "",
      };
    }
    return {
      id,
      status: res.status,
      message: res.message,
      stdout: res.runtimeResult
        ? res.runtimeResult.stdout
        : res.compilerResult
          ? res.compilerResult.stdout
          : "",
      stderr: res.runtimeResult
        ? res.runtimeResult.stderr
        : res.compilerResult
          ? res.compilerResult.stderr
          : "",
    };
  }),
});

export const admin = publicRoute.admin.router({
  submit: publicRoute.admin.submit.handler(() => {
    throw new CrackedError("OTHER", {
      message: "Not implemented",
    });
  }),
});
