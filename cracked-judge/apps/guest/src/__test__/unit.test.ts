import { expect, test } from "bun:test";
import z from "zod";

test("does Bun.file pass z.file() parser?", async () => {
  const fileContent = "hello, world";
  // create bun file & write to disk
  const bunfile = Bun.file("temp.txt");
  await bunfile.write(fileContent);

  // create File type from bun file
  const f = new File([bunfile], "test.file");
  const res = z.file().safeParse(f);

  // shouldn't be an error (but print if it is)
  if (res.error) {
    console.error(z.prettifyError(res.error));
  }

  // should be able to just use the file directly here
  const str = new TextDecoder("utf-8").decode(await f.arrayBuffer());
  expect(str).toBe(fileContent);
  await bunfile.delete();

  expect(res.success).toBe(true);
});
