import createClient from "openapi-fetch";
import type pino from "pino";
import type { paths } from "./firecracker-types";

export class FirecrackerError extends Error {
  response?: Response;
  request?: Request;

  constructor(params: {
    request?: Request;
    response?: Response;
    msg?: string;
  }) {
    const { response, request, msg } = params;
    super(msg);
    this.response = response;
    this.request = request;
  }
}

export const createFirecrackerClient = (params: {
  socket: string;
  vmId: string;
  logger?: pino.Logger;
}) => {
  const { socket, vmId, logger } = params;
  return createClient<paths>({
    baseUrl: "http://localhost/",
    fetch: async (input) => {
      const response = await Bun.fetch(input, { unix: socket });

      const req = input.clone();

      const ctx = {
        vmId,
        socket,
        url: req.url,
        method: req.method,
        status: response.status,
        ok: response.ok,
      };

      if (!response.ok) {
        const text = await response.text().catch(() => "No error body text");
        const errCtx = {
          ...ctx,
          errorMsg: text,
        };

        logger?.error(errCtx, "Firecracker API Error");
        const error = new FirecrackerError({
          request: input,
          response,
          msg: `Firecracker API error: ${text}`,
        });
        throw error;
      }
      logger?.debug(ctx, "Firecracker API success");

      return response;
    },
  });
};

export type FirecrackerClient = ReturnType<typeof createFirecrackerClient>;
