import { procLogAndMaybeThrow, procLogHelper } from "@/lib/utils";
import z from "zod";
import { guestLogger } from "./logger";

const zIsolateLimits = z
  .object({
    time: z.number().nonnegative(),
    memory: z.number().nonnegative(),
    wall_time: z.number().nonnegative(),
    extra_time: z.number().nonnegative(),
    stack_size: z.number().nonnegative(),
    open_files: z.number().nonnegative(),
    file_size: z.number().nonnegative(),
    quota: z.object({
      blocks: z.number().nonnegative(),
      inodes: z.number().nonnegative(),
    }),
    processes: z.number(),
  })
  .partial();

/** returns a command that the execution command can just be appended to directly */
const getRunArgs = (input?: z.input<typeof zIsolateLimits>): string[] => {
  type limits_t = z.infer<typeof zIsolateLimits>;
  type key_t = keyof limits_t;
  type val_t = limits_t[key_t];

  const handleKey = (key: key_t, val: val_t): string | undefined => {
    if (val === undefined) return;

    switch (key) {
      case "time":
        return `--time=${val as number}`;
      case "memory":
        return `--mem=${val as number}`;
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

export const runUnderIsolate = (
  cmd: string[],
  limits?: z.input<typeof zIsolateLimits>,
) => {
  try {
    const initcmd = ["isolate", "--cg", "--init"];
    // throws if limits is invalid
    const runcmd = getRunArgs(limits);

    const initproc = Bun.spawnSync(initcmd);
    procLogAndMaybeThrow(
      initproc,
      initcmd,
      "ISOLATE_INIT",
      "Failed to initialize sandbox",
      guestLogger,
    );
    // isolate's init command yields the absolute path to the box it created
    // here, we can find stdout.txt and stderr.txt
    const boxdir = initproc.stdout.toString().trim();
  } finally {
    const cmd = ["isolate", "--cg", "--cleanup"];
    const proc = Bun.spawnSync(cmd);
    procLogHelper(proc, cmd, guestLogger);
  }
};
