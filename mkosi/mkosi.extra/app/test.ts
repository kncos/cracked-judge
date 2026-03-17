import pino from "pino";
import pretty from "pino-pretty";

const stream = pretty({
  levelFirst: true,
  colorize: true,
  ignore: "time,hostname,pid",
});

export const logger = pino(
  {
    level: "info",
    msgPrefix: "[guest] ",
  },
  stream,
);

type MessageHandler = (data: string | ArrayBuffer | Blob) => void;

type ReconnectingWebSocketOptions = {
  url: string;
  logger: pino.Logger;
  onMessage: MessageHandler;
  reconnectDelayMs?: number;
  pingIntervalMs?: number;
};

const probePort = async (
  hostname: string,
  port: number,
  logger: pino.Logger,
): Promise<boolean> => {
  return new Promise((resolve) => {
    const socket = Bun.connect({
      hostname,
      port,
      socket: {
        open(s) {
          logger.debug(`TCP probe to ${hostname}:${port} succeeded`);
          s.end();
          resolve(true);
        },
        error(s, error) {
          logger.debug(
            { error: error.message },
            `TCP probe to ${hostname}:${port} failed`,
          );
          resolve(false);
        },
        close() {},
        data() {},
      },
    }).catch((err: Error) => {
      logger.debug(
        { error: err.message },
        `TCP probe to ${hostname}:${port} threw`,
      );
      resolve(false);
    });
  });
};

const createReconnectingWebSocket = (
  options: ReconnectingWebSocketOptions,
): { close: () => void } => {
  const {
    url,
    logger,
    onMessage,
    reconnectDelayMs = 3000,
    pingIntervalMs = 3000,
  } = options;

  const state = {
    stopped: false,
    socket: null as WebSocket | null,
    pingInterval: null as ReturnType<typeof setInterval> | null,
    pingId: 0,
  };

  const stopPinging = (): void => {
    if (state.pingInterval !== null) {
      clearInterval(state.pingInterval);
      state.pingInterval = null;
    }
  };

  const connect = (): void => {
    if (state.stopped) return;

    logger.info(`Connecting to ${url}…`);
    const ws = new WebSocket(url);
    state.socket = ws;

    const parsed = new URL(url);
    const port = parseInt(parsed.port || "80", 10);
    probePort(parsed.hostname, port, logger).then((reachable) => {
      if (!reachable) {
        logger.warn(
          `TCP probe failed - port ${port} not reachable. Will retry in ${reconnectDelayMs}ms`,
        );
        setTimeout(connect, reconnectDelayMs);
        return;
      }
      const ws = new WebSocket(url);
      state.socket = ws;
    });

    ws.addEventListener("open", () => {
      logger.info("WebSocket opened");
      state.pingInterval = setInterval(() => {
        state.pingId += 1;
        const msg = `Hello from guest (ping id: ${state.pingId})`;
        ws.send(msg);
        logger.info(`Sent ping ${state.pingId}`);
      }, pingIntervalMs);
    });

    ws.addEventListener("message", (event: MessageEvent) => {
      logger.info({ data: event.data }, "received a message!");
      onMessage(event.data as string | ArrayBuffer | Blob);
    });

    ws.addEventListener("error", (event: Event) => {
      const maybeMessage = (event as any)?.message as string;
      logger.error(
        {
          type: event.type,
          msg: maybeMessage || "no msg",
        },
        "WebSocket error",
      );
    });

    ws.addEventListener("close", (event: CloseEvent) => {
      logger.info(
        { code: event.code, reason: event.reason, wasClean: event.wasClean },
        "WebSocket closed",
      );
      stopPinging();
      state.socket = null;

      if (!state.stopped) {
        logger.info(`Reconnecting in ${reconnectDelayMs}ms…`);
        setTimeout(connect, reconnectDelayMs);
      }
    });
  };

  connect();

  return {
    close: (): void => {
      state.stopped = true;
      stopPinging();
      state.socket?.close();
      state.socket = null;
    },
  };
};

let shouldQuit = false;

const ws = createReconnectingWebSocket({
  url: "ws://localhost:3000",
  logger,
  reconnectDelayMs: 1000,
  onMessage: (data) => {
    if (String(data).trim() === "quit") {
      shouldQuit = true;
      ws.close();
    }
  },
});
