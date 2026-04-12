import { signalCodeMapping } from "@/lib/signal";
import z from "zod";
import { type JudgeStatus } from "../utils";
import { zIsolateLimits, zIsolateMeta } from "./types";

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

  const meta = zIsolateMeta.parse(Object.fromEntries(entries));
  return meta;
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
    // this is never undefined; satisfies linter
    const signal = signalCodeMapping[runtimeMeta.exitsig ?? -1];

    // sigabrt usually means MLE but with --mem instead of --cg-mem
    if (signal === "SIGABRT") {
      return { status: "MLE", message: "Memory Limit Exceeded (probably?)" };
    }
    // SIGXFSZ when we have disk quotas and they are exceeded
    if (signal === "SIGXFSZ") {
      return { status: "RE", message: "I/O limit or disk quota exceeded" };
    }
    // the default message will already tell us what signal it was
    return { status: "RE", message: runtimeMeta.message };
  }

  return { status: "AC", message: "Submission Accepted" };
};

/** returns a command that the execution command can just be appended to directly */
export const getRunArgs = (
  input?: z.input<typeof zIsolateLimits>,
): string[] => {
  type limits_t = z.infer<typeof zIsolateLimits>;
  type key_t = keyof limits_t;
  type val_t = limits_t[key_t];

  const handleKey = (key: key_t, val: val_t): string | undefined => {
    if (val === undefined) return;

    switch (key) {
      case "time":
        return `--time=${val as number}`;
      case "memory":
        // note: we are relying on memory here as an abstraction
        // for --cg-mem since we use control groups, but we may
        // want to just expose mem and cg-mem as separate options
        return `--cg-mem=${val as number}`;
      case "wall_time":
        return `--wall-time=${val as number}`;
      case "extra_time":
        return `--extra-time=${val as number}`;
      case "stack_size":
        return `--stack=${val as number}`;
      case "open_files":
        return `--open-files=${val as number}`;
      case "file_size":
        return `--fsize=${val as number}`;
      case "processes":
        return `--processes=${val as number}`;
      case "quota": {
        const v = val as NonNullable<limits_t["quota"]>;
        return `--quota=${v.blocks},${v.inodes}`;
      }
    }
  };

  const cmd = ["isolate"];

  // only process args if input was provided, otherwise
  // just pass through and provide a generic run command w/
  // hard-coded options
  if (input) {
    const limits = zIsolateLimits.parse(input);
    for (const [k, v] of Object.entries(limits)) {
      const arg = handleKey(k as key_t, v);
      if (arg !== undefined) cmd.push(arg);
    }
  }

  // basic skeleton needed to allow the isolate environment to
  // invoke binaries on the nix system, use shared libraries, etc.
  return [
    ...cmd,
    "--dir=/nix/store/",
    "--dir=/run/current-system/sw",
    "--env=PATH=/run/current-system/sw/bin",
    "--meta=/root/metadata.out",
    "--stdout=stdout.txt",
    "--stderr=stderr.txt",
    "--cg",
    "--run",
  ];
};
