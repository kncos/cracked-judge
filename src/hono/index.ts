import { Hono, type Env, type ExecutionContext } from "hono";
import { logger } from "hono/logger";

const app = new Hono();

app.notFound((c) => {
  return c.text("404: not found", 404);
});

app.use(logger());

const fetch = (request: Request, env: Env, ctx: ExecutionContext) => {
  return app.fetch(request, env, ctx);
};

/**
 * we do this for bun compatibility.
 * @see https://hono.dev/docs/api/hono#fetch
 */
export default {
  fetch,
  port: 3000,
};
