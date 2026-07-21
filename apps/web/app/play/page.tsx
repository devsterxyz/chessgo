"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  createGameSocket,
  setGameSocketListener,
  setGameSocketStatusListener,
} from "../lib/gameSocket";
import playImage from "../../img/Screenshot From 2026-06-02 16-06-45.png";

type TimeControl = {
  id: string;
  label: string;
  description: string;
};

const timeControls: TimeControl[] = [
  { id: "3+0", label: "3 min", description: "Fast blitz" },
  { id: "5+0", label: "5 min", description: "Classic blitz" },
  { id: "10+0", label: "10 min", description: "Relaxed rapid" },
];

function getSelectedTimeLabel(id: string) {
  const selected = timeControls.find((control) => control.id === id);
  return selected ? selected.label : "5 min";
}

function formatTimeControl(id: string) {
  return id.replace("+0", ":00");
}

export default function Play() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [selectedTimeControl, setSelectedTimeControl] = useState("5+0");
  const [username, setUsername] = useState("Player");
  const [socketUnavailable, setSocketUnavailable] = useState(false);
  const wsDisplayUrl = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8081";
  const matchmakingRequestSentRef = useRef(false);
  const queuedInitGameOnOpenRef = useRef<(() => void) | null>(null);
  const queuedInitGameSocketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const user = localStorage.getItem("chessgo_user");

    if (!user) {
      router.replace("/");
      return;
    }

    try {
      const storedUser = JSON.parse(user) as { username?: string };
      setUsername(storedUser.username?.trim() || "Player");
    } catch {
      setUsername("Player");
    }

    setIsAuthorized(true);
  }, [router]);

  useEffect(() => {
    const sendActiveGameRequest = (ws: WebSocket) => {
      const accessToken = localStorage.getItem("chessgo_access_token");
      const user = JSON.parse(localStorage.getItem("chessgo_user") ?? "{}");
      ws.send(
        JSON.stringify({
          type: "get_active_game",
          payload: {
            accessToken,
            userId: user.id,
          },
        }),
      );
    };

    setGameSocketListener((message) => {
      if (!message?.type) return;

      if (message.type === "game_started" || message.type === "GAME_STARTED") {
        if (message.payload?.gameId) {
          router.push(`/game/${message.payload.gameId}`);
        }
      }

      if (message.type === "WAITING_FOR_OPPONENT") {
        matchmakingRequestSentRef.current = true;
        setWaiting(true);
      }

      if (message.type === "MATCHMAKING_CANCELLED") {
        matchmakingRequestSentRef.current = false;
        setWaiting(false);
      }
    });

    setGameSocketStatusListener((status) => {
      if (status === "open" || status === "connecting") {
        setSocketUnavailable(false);
        return;
      }

      if (status === "unavailable") {
        if (
          queuedInitGameOnOpenRef.current &&
          queuedInitGameSocketRef.current
        ) {
          queuedInitGameSocketRef.current.removeEventListener(
            "open",
            queuedInitGameOnOpenRef.current,
          );
          queuedInitGameOnOpenRef.current = null;
          queuedInitGameSocketRef.current = null;
        }

        matchmakingRequestSentRef.current = false;
        setWaiting(false);
        setSocketUnavailable(true);
      }
    });

    const ws = createGameSocket();
    let onOpen: (() => void) | null = null;

    if (ws.readyState === WebSocket.OPEN) {
      sendActiveGameRequest(ws);
    } else {
      onOpen = () => {
        sendActiveGameRequest(ws);
        ws.removeEventListener("open", onOpen!);
      };
      ws.addEventListener("open", onOpen);
    }

    return () => {
      if (onOpen) {
        ws.removeEventListener("open", onOpen);
      }
      if (queuedInitGameOnOpenRef.current && queuedInitGameSocketRef.current) {
        queuedInitGameSocketRef.current.removeEventListener(
          "open",
          queuedInitGameOnOpenRef.current,
        );
      }
      queuedInitGameOnOpenRef.current = null;
      queuedInitGameSocketRef.current = null;
      setGameSocketListener(null);
      setGameSocketStatusListener(null);
    };
  }, [router]);

  if (!isAuthorized) {
    return null;
  }

  function connectWs() {
    if (matchmakingRequestSentRef.current) {
      return;
    }

    matchmakingRequestSentRef.current = true;
    setWaiting(true);
    setSocketUnavailable(false);

    const ws = createGameSocket();
    const accessToken = localStorage.getItem("chessgo_access_token");
    const user = JSON.parse(localStorage.getItem("chessgo_user") ?? "{}");
    const initGameMessage = JSON.stringify({
      type: "init_game",
      payload: {
        accessToken,
        userId: user.id,
        timeControlId: selectedTimeControl,
        rated: true,
      },
    });

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(initGameMessage);
      return;
    }

    if (ws.readyState === WebSocket.CONNECTING) {
      const onOpen = () => {
        ws.send(initGameMessage);
        queuedInitGameOnOpenRef.current = null;
        queuedInitGameSocketRef.current = null;
        ws.removeEventListener("open", onOpen);
      };
      ws.addEventListener("open", onOpen);
      queuedInitGameOnOpenRef.current = onOpen;
      queuedInitGameSocketRef.current = ws;
      return;
    }

    const onOpen = () => {
      ws.send(initGameMessage);
      queuedInitGameOnOpenRef.current = null;
      queuedInitGameSocketRef.current = null;
      ws.removeEventListener("open", onOpen);
    };
    ws.addEventListener("open", onOpen);
    queuedInitGameOnOpenRef.current = onOpen;
    queuedInitGameSocketRef.current = ws;
  }

  function cancelMatchmaking() {
    if (queuedInitGameOnOpenRef.current && queuedInitGameSocketRef.current) {
      queuedInitGameSocketRef.current.removeEventListener(
        "open",
        queuedInitGameOnOpenRef.current,
      );
      queuedInitGameOnOpenRef.current = null;
      queuedInitGameSocketRef.current = null;
      matchmakingRequestSentRef.current = false;
      setWaiting(false);
      return;
    }

    const ws = createGameSocket();
    const accessToken = localStorage.getItem("chessgo_access_token");
    const user = JSON.parse(localStorage.getItem("chessgo_user") ?? "{}");
    const cancelMessage = JSON.stringify({
      type: "cancel_matchmaking",
      payload: {
        accessToken,
        userId: user.id,
      },
    });

    matchmakingRequestSentRef.current = false;
    setWaiting(false);

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(cancelMessage);
      return;
    }

    if (ws.readyState === WebSocket.CONNECTING) {
      ws.addEventListener("open", function onOpen() {
        ws.send(cancelMessage);
        ws.removeEventListener("open", onOpen);
      });
    }
  }

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
                  {waiting ? "Searching..." : "Ready when you are"}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-neutral-100 px-6 py-2 font-mono text-2xl font-bold tabular-nums text-neutral-600">
              {formatTimeControl(selectedTimeControl)}
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center bg-[#fbfaf7] px-4 py-6">
            <div className="relative aspect-square w-full max-w-[650px] overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-2xl shadow-neutral-300/60">
              <Image
                src={playImage}
                sizes="(max-width: 1024px) 92vw, 650px"
                alt="Chess match preview"
                fill
                priority
                className="object-cover"
              />
              <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/35 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/35 to-transparent" />
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
                <p className="text-xs text-neutral-500">You</p>
              </div>
            </div>
            <div className="rounded-lg bg-neutral-900 px-6 py-2 font-mono text-2xl font-bold tabular-nums text-white">
              {formatTimeControl(selectedTimeControl)}
            </div>
          </div>
        </section>

        <aside className="w-full rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-neutral-200/70 lg:min-h-[calc(100vh-3rem)] lg:w-[420px]">
          <div className="px-6 py-8">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
              New Game
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-neutral-950">
              Choose a time
            </h1>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Quick matchmaking with the essentials only.
            </p>

            <div className="mt-6 grid gap-3">
              {timeControls.map((control) => (
                <button
                  key={control.id}
                  type="button"
                  disabled={waiting}
                  onClick={() => setSelectedTimeControl(control.id)}
                  className={`flex min-h-16 items-center justify-between rounded-xl border px-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    selectedTimeControl === control.id
                      ? "border-emerald-500 bg-emerald-50 shadow-sm ring-2 ring-emerald-100"
                      : "border-neutral-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50"
                  }`}
                >
                  <span>
                    <span className="block text-base font-extrabold text-neutral-950">
                      {control.label}
                    </span>
                    <span className="mt-1 block text-xs font-medium text-neutral-500">
                      {control.description}
                    </span>
                  </span>
                  <span
                    className={`h-4 w-4 rounded-full border ${
                      selectedTimeControl === control.id
                        ? "border-emerald-600 bg-emerald-500"
                        : "border-neutral-300 bg-white"
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Selected
              </p>
              <p className="mt-1 text-lg font-extrabold text-neutral-950">
                {getSelectedTimeLabel(selectedTimeControl)} rated game
              </p>
            </div>

            <button
              type="button"
              onClick={connectWs}
              disabled={waiting}
              className="mt-5 h-14 w-full rounded-xl bg-emerald-600 text-xl font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 disabled:shadow-none"
            >
              {waiting ? "Waiting..." : "Start Game"}
            </button>

            {socketUnavailable && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                Game server is offline. Start the websocket server and try
                again.
              </p>
            )}

            {waiting && (
              <button
                type="button"
                onClick={cancelMatchmaking}
                className="mt-3 h-12 w-full rounded-xl border border-red-200 bg-white text-sm font-bold text-red-600 transition hover:border-red-300 hover:bg-red-50"
              >
                Cancel
              </button>
            )}

            <div className="mt-8 rounded-xl bg-[#f7f5f0] px-4 py-4 text-sm text-neutral-600">
              <p className="font-semibold text-neutral-900">
                Matchmaking status
              </p>
              <p className="mt-1">
                {socketUnavailable
                  ? `Waiting for ${wsDisplayUrl}.`
                  : waiting
                    ? "Looking for an opponent..."
                    : "Pick a time control and start when ready."}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
