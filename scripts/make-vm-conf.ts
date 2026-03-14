import path from "path";
import { Path } from "typescript";
import { parseArgs } from "util";

const { values, positionals } = parseArgs({
  args: Bun.argv,
  options: {
    "kernel-path": {
      type: "string",
      short: "k",
      multiple: false,
    },
    "rootfs-path": {
      type: "string",
      short: "r",
      multiple: false,
    },
    "output-dir": {
      type: "string",
      short: "o",
      multiple: false,
    },
  },
  strict: true,
  allowPositionals: false,
});

const pathHelper = (input: string | Path | undefined, arg: string) => {
  if (!input) {
    console.error(`Please provide a path using the ${arg} option`);
    process.exit(-1);
  }
  try {
    const resolved = path.resolve(input);
    if (!path.isAbsolute(input)) {
      console.warn(`Path provided was relative. Resolved to ${resolved}`);
    }
    return resolved;
  } catch (e) {
    console.error(
      `Path provided was invalid or unexpected. Received ${input}`,
      `  Error: ${(e as Error)?.message || e}`,
    );
    process.exit(-1);
  }
};

const main = () => {
  const kernelPath = pathHelper(values["kernel-path"], "kernel-path");
  const outputPath = pathHelper(values["output-dir"], "output-dir");
  const rootfsPath = pathHelper(values["rootfs-path"], "rootfs-path");
};
