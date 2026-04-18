import { CrackedError, signalCodeMapping } from "@cracked-judge/common";
import { zIsolateMeta, type JudgeStatus } from "@cracked-judge/common/contract";
import z from "zod";
import { guestLogger } from "../utils";

export const parseMeta = (fileText: string): z.infer<typeof zIsolateMeta> => {
  const entries = fileText
    .split("\n")
    .map((line) => line.split(":"))
    .filter((pair) => pair.length >= 2)
    // `:` substituted back in if a value inadvertantly had a `:`,
    // but it never should have this because isolate generates the values
    // and `:` is its delimiter
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    .map(([k, ...v]) => [k!.replaceAll("-", "_"), v.join(":")]);

  const metaRes = zIsolateMeta.safeParse(Object.fromEntries(entries));
  if (metaRes.error) {
    guestLogger.error(z.prettifyError(metaRes.error));
    throw new CrackedError("PARSE_ERROR", {
      message: "failed to parse isolate metadata file",
      cause: metaRes.error,
    });
  }

  return metaRes.data;
};

export const interpretMeta = (
  runtimeMeta: z.infer<typeof zIsolateMeta>,
): {
  status: JudgeStatus;
  message: string;
} => {
  // some internal error to isolate occurred. Never want to see this
  if (runtimeMeta.status === "XX") {
    return { status: "IE", message: "Something went wrong" };
  }

  if (runtimeMeta.status === "TO") {
    return { status: "TLE", message: "Time Limit Exceeded" };
  }

  // when this happens, we also get meta.status === "SG" w/ SIGSEGV, but
  // seeing cg_oom_killed alone is all we need to classify MLE
  if (runtimeMeta.cg_oom_killed) {
    return { status: "MLE", message: "Memory Limit Exceeded" };
  }

  // 69 is reserved (arbitrarily) by my judge driver code as the "wrong answer"
  // exit code. This is probably "RE" status but we only need to see 69 to classify WA
  if (runtimeMeta?.exitcode === 69) {
    return { status: "WA", message: "Wrong Answer" };
  }

  // some other non-zero exit code received. Probably means user program threw
  // and the judge returned non-zero but non-69 as a result to indicate a bad submission
  if (runtimeMeta.status === "RE") {
    return { status: "RE", message: "Runtime Error" };
  }

  // process terminated with a signal
  if (runtimeMeta.status === "SG") {
    const sig = signalCodeMapping[runtimeMeta.exitsig || -1];
    if (sig === "SIGXFSZ") {
      return { status: "OLE", message: "output limit exceeded" };
    }

    // default message informs us of the signal
    return { status: "RE", message: runtimeMeta.message };
  }

  return { status: "AC", message: "Submission Accepted" };
};
