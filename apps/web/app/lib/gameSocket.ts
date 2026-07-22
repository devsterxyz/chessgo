"use client";

export type GameSocketMessage = {
  type?: string;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
};

type GameSocketStatus = "connecting" | "open" | "closed" | "unavailable";

let socket: WebSocket | null = null;
let messageListener: ((message: GameSocketMessage) => void) | null = null;
let statusListener: ((status: GameSocketStatus) => void) | null = null;
let lastGameStartedMessage: GameSocketMessage | null = null;

const GAME_SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8081";

export function createGameSocket() {
  if (
    socket &&
    (socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING)
  ) {
    return socket;
  }

  statusListener?.("connecting");
  socket = new WebSocket(GAME_SOCKET_URL);

  socket.addEventListener("open", () => {
    statusListener?.("open");
  });

  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data) as GameSocketMessage;
      if (
        message?.type === "game_started" ||
        message?.type === "GAME_STARTED"
      ) {
        lastGameStartedMessage = message;
      }
      messageListener?.(message);
    } catch (error) {
      console.error("Failed to parse socket message", error);
    }
  });

  socket.addEventListener("close", () => {
    socket = null;
    statusListener?.("closed");
  });

  socket.addEventListener("error", () => {
    statusListener?.("unavailable");
  });

  return socket;
}

export function getGameSocket() {
  return socket;
}

export function getLastGameStartedMessage() {
  return lastGameStartedMessage;
}

export function sendGameSocketMessage(message: GameSocketMessage) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify(message));
}

export function setGameSocketListener(
  listener: ((message: GameSocketMessage) => void) | null,
) {
  messageListener = listener;
}

export function setGameSocketStatusListener(
  listener: ((status: GameSocketStatus) => void) | null,
) {
  statusListener = listener;
}

export function closeGameSocket() {
  if (!socket) return;
  socket.close();
  socket = null;
  messageListener = null;
  statusListener = null;
  lastGameStartedMessage = null;
}
