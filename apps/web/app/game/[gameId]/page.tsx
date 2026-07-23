"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
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

type PendingConfirmation = "draw" | "resign" | null;

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
  const positionHistoryRef = useRef<string[]>([STARTING_FEN]);
  const moveHistoryRef = useRef<MoveRecord[]>([]);
  const previousHistoryLengthRef = useRef(1);
  const lastAppliedMoveRef = useRef<{
    fen: string;
    label: string | null;
  } | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameEnd, setGameEnd] = useState(false);
  const [gameResult, setGameResult] = useState("Game Over");
  const [username, setUsername] = useState("Player");
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation>(null);
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
      const nextMoves = nextPositions.length === moves.length + 1 ? moves : [];

      setFen(nextFen);
      setPositionHistory(nextPositions);
      setPositionIndex(nextPositions.length - 1);
      setMoveHistory(nextMoves);
      positionHistoryRef.current = nextPositions;
      moveHistoryRef.current = nextMoves;
      lastAppliedMoveRef.current = {
        fen: nextPositions[nextPositions.length - 1] ?? nextFen,
        label: nextMoves[nextMoves.length - 1]?.label ?? null,
      };
    },
    [],
  );

  const addLivePosition = useCallback((nextFen: string, move: unknown) => {
    const nextMoveLabel = getMoveLabel(move);
    const previousAppliedMove = lastAppliedMoveRef.current;

    if (
      previousAppliedMove &&
      previousAppliedMove.fen === nextFen &&
      previousAppliedMove.label === nextMoveLabel
    ) {
      return;
    }

    setFen(nextFen);
    setPositionHistory((history) => {
      if (history[history.length - 1] === nextFen) {
        setPositionIndex(history.length - 1);
        lastAppliedMoveRef.current = {
          fen: nextFen,
          label: nextMoveLabel,
        };
        return history;
      }

      const nextHistory = [...history, nextFen];
      setMoveHistory((moves) => {
        const lastMoveLabel = moves[moves.length - 1]?.label;
        if (lastMoveLabel === nextMoveLabel) {
          lastAppliedMoveRef.current = {
            fen: nextFen,
            label: nextMoveLabel,
          };
          return moves;
        }

        const nextMoves = [...moves, { label: nextMoveLabel }];
        moveHistoryRef.current = nextMoves;
        return nextMoves;
      });
      setPositionIndex(nextHistory.length - 1);
      positionHistoryRef.current = nextHistory;
      lastAppliedMoveRef.current = {
        fen: nextFen,
        label: nextMoveLabel,
      };
      return nextHistory;
    });
  }, []);

  useEffect(() => {
    positionHistoryRef.current = positionHistory;
    moveHistoryRef.current = moveHistory;
  }, [moveHistory, positionHistory]);

  useEffect(() => {
    if (positionHistory.length > previousHistoryLengthRef.current) {
      setPositionIndex(positionHistory.length - 1);
    }
    previousHistoryLengthRef.current = positionHistory.length;
  }, [positionHistory.length]);

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
    setPendingConfirmation("resign");
  };

  const confirmResignGame = () => {
    if (gameEnd) return;

    setPendingConfirmation(null);
    sendGameSocketMessage({
      type: "resign_game",
    });
  };

  const drawGame = () => {
    if (gameEnd) return;
    setPendingConfirmation("draw");
  };

  const confirmDrawGame = () => {
    if (gameEnd) return;

    setPendingConfirmation(null);
    sendGameSocketMessage({
      type: "draw_offer",
    });
  };

  const acceptDraw = () => {
    if (gameEnd) return;

    setPendingConfirmation(null);
    sendGameSocketMessage({
      type: "draw_accept",
    });
  };

  const declineDraw = () => {
    if (gameEnd) return;

    setPendingConfirmation(null);
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
  const confirmationQuestion =
    pendingConfirmation === "resign"
      ? "Do you want to resign?"
      : pendingConfirmation === "draw"
        ? "Do you want to offer a draw?"
        : "";
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

  const showPreviousPosition = useCallback(() => {
    setPositionIndex((index) => Math.max(0, index - 1));
  }, []);

  const showNextPosition = useCallback(() => {
    setPositionIndex((index) =>
      Math.min(positionHistory.length - 1, index + 1),
    );
  }, [positionHistory.length]);

  const showStartingPosition = useCallback(() => {
    setPositionIndex(0);
  }, []);

  const showLatestPosition = useCallback(() => {
    setPositionIndex(positionHistory.length - 1);
  }, [positionHistory.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (isTyping) return;

      if (event.key === "ArrowLeft" && canGoBack) {
        event.preventDefault();
        showPreviousPosition();
      }

      if (event.key === "ArrowRight" && canGoForward) {
        event.preventDefault();
        showNextPosition();
      }

      if (event.key === "ArrowUp" && canGoForward) {
        event.preventDefault();
        showLatestPosition();
      }

      if (event.key === "ArrowDown" && canGoBack) {
        event.preventDefault();
        showStartingPosition();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canGoBack,
    canGoForward,
    showLatestPosition,
    showNextPosition,
    showPreviousPosition,
    showStartingPosition,
  ]);

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
    <main className="h-screen overflow-hidden bg-[#f7f5f0] text-neutral-950">
      <div className="mx-auto flex h-full w-full max-w-[1180px] flex-col gap-3 overflow-hidden px-3 py-3 lg:flex-row lg:gap-4 lg:px-5">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-neutral-200/70">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-100 px-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-neutral-100 text-center text-2xl leading-9 text-neutral-500">
                ♟
              </div>
              <div>
                <p className="text-sm font-bold">Opponent</p>
                <p className="text-xs text-neutral-500">
                  {connected ? topLabel : "Ready when you are"}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-neutral-100 px-4 py-1.5 font-mono text-xl font-bold tabular-nums text-neutral-600">
              {formatClock(topDisplayMs)}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center bg-[#fbfaf7] px-3 py-3">
            <div className="relative aspect-square h-full max-h-full w-auto max-w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-2xl shadow-neutral-300/60">
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

          <div className="flex h-14 shrink-0 items-center justify-between border-t border-neutral-100 px-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 overflow-hidden rounded-lg bg-neutral-100">
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
            <div className="rounded-lg bg-neutral-900 px-4 py-1.5 font-mono text-xl font-bold tabular-nums text-white">
              {formatClock(bottomDisplayMs)}
            </div>
          </div>
        </section>

        <aside className="min-h-0 w-full shrink-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-neutral-200/70 lg:w-[390px]">
          <div className="flex h-full min-h-0 flex-col overflow-hidden px-5 py-5">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
              Live Game
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-neutral-950">
              Game actions
            </h1>
            <p className="mt-1 text-sm leading-5 text-neutral-500">
              {connected
                ? playerColor
                  ? `Playing as ${playerColor === "white" ? "White" : "Black"}.`
                  : "Connected to game."
                : "Connecting to game..."}
            </p>

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={drawGame}
                disabled={gameEnd || !connected || hasOutgoingDrawOffer}
                className="h-11 rounded-xl border border-neutral-200 bg-white px-5 text-sm font-bold text-neutral-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {hasOutgoingDrawOffer ? "Draw Offered" : "Offer Draw"}
              </button>
              <button
                type="button"
                onClick={resignGame}
                disabled={gameEnd || !connected}
                className="h-11 rounded-xl border border-red-200 bg-white px-5 text-sm font-bold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Resign
              </button>
            </div>

            {pendingConfirmation && (
              <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                <p className="text-sm font-bold text-neutral-900">
                  {confirmationQuestion}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={
                      pendingConfirmation === "resign"
                        ? confirmResignGame
                        : confirmDrawGame
                    }
                    className="h-10 rounded-lg bg-emerald-600 text-sm font-extrabold text-white transition hover:bg-emerald-500"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingConfirmation(null)}
                    className="h-10 rounded-lg border border-neutral-200 bg-white text-sm font-bold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-100"
                  >
                    No
                  </button>
                </div>
              </div>
            )}

            {hasIncomingDrawOffer && (
              <div className="mt-4 flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
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

            <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm text-neutral-700 shadow-lg shadow-neutral-200/70">
              <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-[#faf8f3] px-4 py-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    Move History
                  </p>
                  <p className="text-sm font-bold text-neutral-900">
                    Review the game
                  </p>
                </div>
              </div>

              <div className="grid shrink-0 grid-cols-[3rem_1fr_1fr] border-b border-neutral-200 bg-neutral-50">
                <p className="px-3 py-2 text-xs font-bold text-neutral-500">
                  #
                </p>
                <p className="px-3 py-2 font-bold text-neutral-900">White</p>
                <p className="px-3 py-2 font-bold text-neutral-900">Black</p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-white">
                {movePairs.length > 0 ? (
                  movePairs.map((pair) => (
                    <div
                      key={pair.moveNumber}
                      className="grid grid-cols-[3rem_1fr_1fr] border-b border-neutral-100 odd:bg-neutral-50"
                    >
                      <div className="px-3 py-2 text-xs font-bold text-neutral-500">
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
                        disabled={!pair.white}
                      >
                        {pair.white?.label ?? "—"}
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
                  ))
                ) : (
                  <p className="px-3 py-4 text-neutral-500">
                    {connected
                      ? "No moves played yet."
                      : "Waiting for connection."}
                  </p>
                )}
              </div>

              <div className="shrink-0 border-t border-neutral-200 bg-[#faf8f3] px-2 py-2">
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={showStartingPosition}
                    disabled={!canGoBack}
                    aria-label="Show starting position"
                    className="h-10 rounded-lg bg-white text-lg font-extrabold text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    |&lt;
                  </button>
                  <button
                    type="button"
                    onClick={showPreviousPosition}
                    disabled={!canGoBack}
                    aria-label="Show previous move"
                    className="h-10 rounded-lg bg-white text-lg font-extrabold text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    &lt;
                  </button>
                  <button
                    type="button"
                    onClick={showNextPosition}
                    disabled={!canGoForward}
                    aria-label="Show next move"
                    className="h-10 rounded-lg bg-white text-lg font-extrabold text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    &gt;
                  </button>
                  <button
                    type="button"
                    onClick={showLatestPosition}
                    disabled={!canGoForward}
                    aria-label="Show latest position"
                    className="h-10 rounded-lg bg-white text-lg font-extrabold text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    &gt;|
                  </button>
                </div>
                <p className="mt-2 text-xs font-semibold text-neutral-500">
                  {gameEnd
                    ? gameResult
                    : !isViewingLatest
                      ? `${positionIndex}/${positionHistory.length - 1}`
                      : connected
                        ? "Live"
                        : "Connecting"}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
