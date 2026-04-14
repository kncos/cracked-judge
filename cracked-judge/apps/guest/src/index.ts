import z from "zod";

const zTest = z.object({
  a: z.number(),
});

const res = zTest.safeParse({ b: 10 });
if (res.error) {
  console.log(z.prettifyError(res.error));
} else {
  console.log(JSON.stringify(res.data, null, 2));
}
