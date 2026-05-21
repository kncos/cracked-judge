import { route } from "../orpc";

export const judge = route.judge.router({
  submit: route.judge.submit.handler(async ({ input, context }) => {}),
  get: route.judge.get.handler(async ({ input }) => {}),
  test: route.judge.test.handler(() => ({ ok: true })),
});
