import path from "path";
import { fileExists } from "../utils";
import { BaseDir } from "./base-directory";
import { Dir } from "./directory";

export class RecursiveDir extends BaseDir {
  private stack: DisposableStack;

  protected override performDestroy(): void {
    this.stack.dispose();
  }

  constructor(dir: string) {
    // should be an absolute path anyways
    dir = path.resolve(dir);
    super(dir);
    this.stack = new DisposableStack();
    const segments = dir.split(path.sep);
    let curPath = "/";
    for (const s of segments) {
      curPath = path.join(curPath, s);
      if (fileExists(curPath)) {
        continue;
      }
      this.stack.use(new Dir(curPath));
    }
  }
}
