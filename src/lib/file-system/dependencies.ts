import { CrackedError } from "../judge-error";
import { indentStr } from "../utils";

export const dependencies = [
  "mount",
  "umount",
  "rm",
  "mountpoint",
  "mkdir",
  "chown",
  "chmod",
  "mktemp",
];

const missing = dependencies.filter((d) => Bun.which(d) === null);

if (missing.length > 0) {
  throw new CrackedError("FS_DEPENDENCY_CHECK", {
    message: `Missing dependencies: ${indentStr(missing.join("\n"), 1, "  - ")}`,
  });
}
