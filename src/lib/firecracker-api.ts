import createClient from "openapi-fetch";
import type pino from "pino";
import type { paths } from "./firecracker-types";
import { logger } from "./logger";
import { tryCatch } from "./utils";

export class FirecrackerError extends Error {
  response?: Response;
  request?: Request;

  constructor(params: { request?: Request; response?: Response; msg: string }) {
    const { response, request, msg } = params;
    super(msg);
    this.response = response;
    this.request = request;
  }
}

export const createFirecrackerClient = (params: {
  socket: string;
  vmId: string;
  fcLogger?: pino.Logger;
}) => {
  const { socket, vmId, fcLogger = logger } = params;
  return createClient<paths>({
    baseUrl: "http://localhost/",
    fetch: async (input) => {
      // const req = input.clone();
      const baseCtx = {
        vmId,
        socket,
        url: input.url,
        method: input.method,
      };

      const { data: response, error: fetchErr } = await tryCatch(
        Bun.fetch(input, { unix: socket }),
      );

      // handle the case where fetch itself fails
      if (fetchErr) {
        fcLogger.error({ ...baseCtx, error: fetchErr }, "Fetch call failed");
        throw new FirecrackerError({
          msg: `Firecracker API Error: ${fetchErr.message}`,
        });
      }

      // didn't fail; so we have a response for added ctx
      const ctx = {
        ...baseCtx,
        status: response.status,
        ok: response.ok,
      };

      // bad response
      if (!response.ok) {
        const text = await response.text().catch(() => "No error body text");
        const errCtx = {
          ...ctx,
          errorMsg: text,
        };

        fcLogger.error(errCtx, "Firecracker API Error");
        const error = new FirecrackerError({
          request: input,
          response,
          msg: `Firecracker API error: ${text}`,
        });
        throw error;
      }

      // good response
      fcLogger.debug(ctx, "Firecracker API success");
      return response;
    },
  });
};

export type FirecrackerClient = ReturnType<typeof createFirecrackerClient>;
