import z from "zod";

for (let i = 0; i < 20; i++) {
  console.log(`submit ${crypto.randomUUID().slice(0, 8)}`);
}

const zTest = z
  .object({
    val: z.number().optional().default(0),
  })
  .partial();

const a = zTest.parse({});
console.log(JSON.stringify(a, null, 2));
const b = zTest.parse({ val: 1 });
console.log(JSON.stringify(b, null, 2));
