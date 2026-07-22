"use client";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChessBoard } from "@repo/ui/ChessBoard";
import { Chess } from "chess.js";
import {
  createGameSocket,
  type GameSocketMessage,
  getLastGameStartedMessage,
  sendGameSocketMessage,
  setGameSocketListener,
} from "../../lib/gameSocket";
import playImage from "../../../img/Screenshot From 2026-06-02 16-06-45.png";

type PlayerColor = "white" | "black";

type ClockState = {
  whiteTimeMs: number;
  blackTimeMs: number;
  activeColor: PlayerColor;
  drawOfferBy: PlayerColor | null;
  receivedAtMs: number;
};

type ClockPayload = {
  whiteTimeMs?: unknown;
  blackTimeMs?: unknown;
  activeColor?: unknown;
  drawOfferBy?: unknown;
};

type StoredUser = {
  username?: string;
};

type MoveRecord = {
  label: string;
};

const STARTING_FEN = new Chess().fen();

function getPayload(message: GameSocketMessage): Record<string, unknown> {
  return message.payload ?? {};
}

function normalizePlayerColor(color: unknown): PlayerColor | null {
  if (color === "white" || color === "w") return "white";
  if (color === "black" || color === "b") return "black";
  return null;
}

function formatClock(ms: number) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getMoveLabel(move: unknown) {
  if (!move || typeof move !== "object") return "Move";

  const moveRecord = move as Record<string, unknown>;
  if (typeof moveRecord.san === "string") return moveRecord.san;

  const from = typeof moveRecord.from === "string" ? moveRecord.from : "";
  const to = typeof moveRecord.to === "string" ? moveRecord.to : "";
  const promotion =
    typeof moveRecord.promotion === "string" ? `=${moveRecord.promotion}` : "";

  return from && to ? `${from}-${to}${promotion}` : "Move";
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getMoveHistory(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.map((move) => ({
    label: getMoveLabel(move),
  }));
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId =
    typeof params.gameId === "string"
      ? params.gameId
      : Array.isArray(params.gameId)
        ? params.gameId[0]
        : undefined;
  const [fen, setFen] = useState(STARTING_FEN);
  const [positionHistory, setPositionHistory] = useState<string[]>([
    STARTING_FEN,
  ]);
  const [positionIndex, setPositionIndex] = useState(0);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [playerColor, setPlayerColor] = useState<PlayerColor | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameEnd, setGameEnd] = useState(false);
  const [gameResult, setGameResult] = useState("Game Over");
  const [username, setUsername] = useState("Player");
  const [clock, setClock] = useState<ClockState>(() => ({
    whiteTimeMs: 2 * 60 * 1000,
    blackTimeMs: 2 * 60 * 1000,
    activeColor: "white",
    drawOfferBy: null,
    receivedAtMs: Date.now(),
  }));
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const storedUser = localStorage.getItem("chessgo_user");

    if (!storedUser) {
      return;
    }

    try {
      const user = JSON.parse(storedUser) as StoredUser;
      window.queueMicrotask(() => {
        setUsername(user.username?.trim() || "Player");
      });
    } catch {
      window.queueMicrotask(() => {
        setUsername("Player");
      });
    }
  }, []);

  const syncClock = useCallback((payload: ClockPayload) => {
    const activeColor = normalizePlayerColor(payload?.activeColor);
    if (
      typeof payload?.whiteTimeMs !== "number" ||
      typeof payload?.blackTimeMs !== "number" ||
      !activeColor
    ) {
      return;
    }

    setClock({
      whiteTimeMs: payload.whiteTimeMs,
      blackTimeMs: payload.blackTimeMs,
      activeColor,
      drawOfferBy: normalizePlayerColor(payload?.drawOfferBy),
      receivedAtMs: Date.now(),
    });
    setNowMs(Date.now());
  }, []);

  const resetPositionHistory = useCallback(
    (nextFen: string, positions: string[] = [], moves: MoveRecord[] = []) => {
      const nextPositions =
        positions.length > 0 && positions.length === moves.length + 1
          ? positions
          : [nextFen];
      const nextMoves =
        nextPositions.length === moves.length + 1 ? moves : [];

      setFen(nextFen);
      setPositionHistory(nextPositions);
      setPositionIndex(nextPositions.length - 1);
      setMoveHistory(nextMoves);
    },
    [],
  );

  const addLivePosition = useCallback(
    (nextFen: string, move: unknown) => {
      setFen(nextFen);
      setPositionHistory((history) => {
        if (history[history.length - 1] === nextFen) {
          setPositionIndex(history.length - 1);
          return history;
        }

        const nextHistory = [...history, nextFen];
        setMoveHistory((moves) => [
          ...moves,
          { label: getMoveLabel(move) },
        ]);
        setPositionIndex(nextHistory.length - 1);
        return nextHistory;
      });
    },
    [],
  );

  useEffect(() => {
    const ws = createGameSocket();
    const sendResumeGame = () => {
      const user = JSON.parse(localStorage.getItem("chessgo_user") ?? "{}");
      ws.send(
        JSON.stringify({
          type: "resume_game",
          payload: {
            gameId,
            accessToken: localStorage.getItem("chessgo_access_token"),
            userId: user.id,
          },
        }),
      );
    };

    const handleMessage = (message: GameSocketMessage) => {
      if (!message?.type) return;
      const payload = getPayload(message);

      switch (message.type) {
        case "game_started":
        case "GAME_STARTED":
          setPlayerColor(normalizePlayerColor(payload.color));
          resetPositionHistory(
            typeof payload.fen === "string" ? payload.fen : STARTING_FEN,
            getStringArray(payload.positionHistory),
            getMoveHistory(payload.moveHistory),
          );
          syncClock(payload);
          if (typeof payload.gameId === "string" && payload.gameId !== gameId) {
            router.replace(`/game/${payload.gameId}`);
          }
          break;
        case "move":
        case "MOVE":
          addLivePosition(
            typeof payload.fen === "string"
              ? payload.fen
              : typeof message.fen === "string"
                ? message.fen
                : STARTING_FEN,
            payload.move,
          );
          syncClock(payload);
          break;
        case "DRAW_OFFER":
        case "DRAW_DECLINED":
          syncClock(payload);
          break;
        case "GAME_OVER":
          const winner = normalizePlayerColor(payload.winner);
          const reason =
            typeof payload.reason === "string" ? payload.reason : "";
          const result = payload.draw
            ? "Draw"
            : winner
              ? `${winner === "white" ? "White" : "Black"} wins${reason === "timeout" ? " on time" : reason === "resign" ? " by resignation" : ""}!`
              : "Game Over";
          syncClock(payload);
          setGameResult(result);
          setGameEnd(true);
          break;
      }
    };

    const lastGameStartedMessage = getLastGameStartedMessage();
    const lastPayload = lastGameStartedMessage
      ? getPayload(lastGameStartedMessage)
      : {};
    if (
      lastGameStartedMessage &&
      ((typeof lastPayload.gameId === "string" &&
        lastPayload.gameId === gameId) ||
        (!gameId && typeof lastPayload.gameId === "string"))
    ) {
      handleMessage(lastGameStartedMessage);
    }

    setGameSocketListener(handleMessage);

    let onOpen: (() => void) | null = null;
    if (ws.readyState === WebSocket.OPEN) {
      window.queueMicrotask(() => setConnected(true));
      sendResumeGame();
    } else {
      onOpen = () => {
        setConnected(true);
        sendResumeGame();
      };
      ws.addEventListener("open", onOpen);
    }

    return () => {
      if (onOpen) {
        ws.removeEventListener("open", onOpen);
      }
      setGameSocketListener(null);
    };
  }, [addLivePosition, gameId, resetPositionHistory, router, syncClock]);

  useEffect(() => {
    if (!gameId) {
      router.replace("/play");
    }
  }, [gameId, router]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 250);

    return () => window.clearInterval(interval);
  }, []);

  const handleMove = (from: string, to: string, promotion?: string) => {
    if (gameEnd) return;
    if (positionIndex !== positionHistory.length - 1) {
      setPositionIndex(positionHistory.length - 1);
      return;
    }

    const move: { from: string; to: string; promotion?: string } = { from, to };
    if (promotion) move.promotion = promotion;
    sendGameSocketMessage({
      type: "move",
      move,
    });
  };

  const resignGame = () => {
    if (gameEnd) return;

    sendGameSocketMessage({
      type: "resign_game",
    });
  };

  const drawGame = () => {
    if (gameEnd) return;

    sendGameSocketMessage({
      type: "draw_offer",
    });
  };

  const acceptDraw = () => {
    if (gameEnd) return;

    sendGameSocketMessage({
      type: "draw_accept",
    });
  };

  const declineDraw = () => {
    if (gameEnd) return;

    sendGameSocketMessage({
      type: "draw_decline",
    });
  };

  const elapsedMs = gameEnd ? 0 : nowMs - clock.receivedAtMs;
  const whiteDisplayMs =
    clock.activeColor === "white"
      ? clock.whiteTimeMs - elapsedMs
      : clock.whiteTimeMs;
  const blackDisplayMs =
    clock.activeColor === "black"
      ? clock.blackTimeMs - elapsedMs
      : clock.blackTimeMs;
  const hasIncomingDrawOffer = Boolean(
    playerColor && clock.drawOfferBy && clock.drawOfferBy !== playerColor,
  );
  const hasOutgoingDrawOffer = Boolean(
    playerColor && clock.drawOfferBy && clock.drawOfferBy === playerColor,
  );
  const bottomColor = playerColor ?? "white";
  const topColor: PlayerColor = bottomColor === "white" ? "black" : "white";
  const topDisplayMs = topColor === "white" ? whiteDisplayMs : blackDisplayMs;
  const bottomDisplayMs =
    bottomColor === "white" ? whiteDisplayMs : blackDisplayMs;
  const topLabel = topColor === "white" ? "White" : "Black";
  const bottomLabel = bottomColor === "white" ? "White" : "Black";
  const displayedFen = positionHistory[positionIndex] ?? fen;
  const canGoBack = positionIndex > 0;
  const canGoForward = positionIndex < positionHistory.length - 1;
  const isViewingLatest = !canGoForward;

  const showPreviousPosition = () => {
    setPositionIndex((index) => Math.max(0, index - 1));
  };

  const showNextPosition = () => {
    setPositionIndex((index) => Math.min(positionHistory.length - 1, index + 1));
  };
  const movePairs = Array.from(
    { length: Math.ceil(moveHistory.length / 2) },
    (_, index) => ({
      moveNumber: index + 1,
      white: moveHistory[index * 2],
      black: moveHistory[index * 2 + 1],
      whiteIndex: index * 2 + 1,
      blackIndex: index * 2 + 2,
    }),
  );

  return (
    <main className="min-h-screen bg-[#f7f5f0] text-neutral-950">
      <div className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
        <section className="flex min-h-[58vh] flex-1 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-neutral-200/70 lg:min-h-[calc(100vh-3rem)]">
          <div className="flex h-16 items-center justify-between border-b border-neutral-100 px-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-neutral-100 text-center text-3xl leading-10 text-neutral-500">
                ♟
              </div>
              <div>
                <p className="text-sm font-bold">Opponent</p>
                <p className="text-xs text-neutral-500">
                  {connected ? topLabel : "Ready when you are"}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-neutral-100 px-6 py-2 font-mono text-2xl font-bold tabular-nums text-neutral-600">
              {formatClock(topDisplayMs)}
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center bg-[#fbfaf7] px-4 py-6">
            <div className="relative aspect-square w-full max-w-[650px] overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-2xl shadow-neutral-300/60">
              <div className="flex h-full w-full items-center justify-center">
                <ChessBoard
                  position={displayedFen}
                  playerColor={playerColor}
                  onMove={handleMove}
                />
              </div>
              {gameEnd && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/75 backdrop-blur-sm">
                  <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-2xl shadow-neutral-300/70">
                    <h2 className="mb-3 text-2xl font-extrabold text-neutral-950">
                      Game Over
                    </h2>
                    <p className="mb-6 text-lg text-neutral-600">
                      {gameResult}
                    </p>
                    <button
                      onClick={() => router.push("/play")}
                      className="rounded-xl bg-emerald-600 px-6 py-3 font-extrabold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-500"
                    >
                      Back to Play
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex h-16 items-center justify-between border-t border-neutral-100 px-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-lg bg-neutral-100">
                <Image
                  src={playImage}
                  alt=""
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-bold">
                  {username}{" "}
                  <span className="font-normal text-neutral-500">(625)</span>
                </p>
                <p className="text-xs text-neutral-500">
                  You{connected ? ` - ${bottomLabel}` : ""}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-neutral-900 px-6 py-2 font-mono text-2xl font-bold tabular-nums text-white">
              {formatClock(bottomDisplayMs)}
            </div>
          </div>
        </section>

        <aside className="w-full rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-neutral-200/70 lg:min-h-[calc(100vh-3rem)] lg:w-[420px]">
          <div className="px-6 py-8">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
              Live Game
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-neutral-950">
              Game actions
            </h1>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              {connected
                ? playerColor
                  ? `Playing as ${playerColor === "white" ? "White" : "Black"}.`
                  : "Connected to game."
                : "Connecting to game..."}
            </p>

            <div className="mt-6 grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={showPreviousPosition}
                  disabled={!canGoBack}
                  aria-label="Show previous move"
                  className="h-12 rounded-xl border border-neutral-200 bg-white px-5 text-xl font-extrabold text-neutral-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={showNextPosition}
                  disabled={!canGoForward}
                  aria-label="Show next move"
                  className="h-12 rounded-xl border border-neutral-200 bg-white px-5 text-xl font-extrabold text-neutral-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  →
                </button>
              </div>
              <button
                type="button"
                onClick={drawGame}
                disabled={gameEnd || !connected || hasOutgoingDrawOffer}
                className="h-12 rounded-xl border border-neutral-200 bg-white px-5 text-sm font-bold text-neutral-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {hasOutgoingDrawOffer ? "Draw Offered" : "Offer Draw"}
              </button>
              <button
                type="button"
                onClick={resignGame}
                disabled={gameEnd || !connected}
                className="h-12 rounded-xl border border-red-200 bg-white px-5 text-sm font-bold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Resign
              </button>
            </div>

            {hasIncomingDrawOffer && (
              <div className="mt-5 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-sm font-bold text-emerald-800">
                  Opponent offered a draw
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={acceptDraw}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-500"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={declineDraw}
                    className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-bold text-neutral-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="mt-8 rounded-xl bg-[#f7f5f0] px-4 py-4 text-sm text-neutral-600">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-neutral-900">Moves</p>
                <p className="text-xs font-semibold text-neutral-500">
                  {gameEnd
                    ? gameResult
                    : !isViewingLatest
                      ? `${positionIndex}/${positionHistory.length - 1}`
                      : connected
                        ? "Live"
                        : "Connecting"}
                </p>
              </div>

              {movePairs.length > 0 ? (
                <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-neutral-200 bg-white">
                  {movePairs.map((pair) => (
                    <div
                      key={pair.moveNumber}
                      className="grid grid-cols-[3rem_1fr_1fr] border-b border-neutral-100 last:border-b-0"
                    >
                      <div className="bg-neutral-50 px-3 py-2 text-xs font-bold text-neutral-500">
                        {pair.moveNumber}.
                      </div>
                      <button
                        type="button"
                        onClick={() => setPositionIndex(pair.whiteIndex)}
                        className={`px-3 py-2 text-left font-semibold transition hover:bg-emerald-50 hover:text-emerald-700 ${
                          positionIndex === pair.whiteIndex
                            ? "bg-emerald-50 text-emerald-700"
                            : "text-neutral-700"
                        }`}
                      >
                        {pair.white.label}
                      </button>
                      {pair.black ? (
                        <button
                          type="button"
                          onClick={() => setPositionIndex(pair.blackIndex)}
                          className={`px-3 py-2 text-left font-semibold transition hover:bg-emerald-50 hover:text-emerald-700 ${
                            positionIndex === pair.blackIndex
                              ? "bg-emerald-50 text-emerald-700"
                              : "text-neutral-700"
                          }`}
                        >
                          {pair.black.label}
                        </button>
                      ) : (
                        <div className="px-3 py-2 text-neutral-400">...</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-lg border border-neutral-200 bg-white px-3 py-3">
                  {connected
                    ? "No moves played yet."
                    : "Waiting for connection."}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
