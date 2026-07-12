"use client"
import { Button } from "@repo/ui/Button"
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Navbar } from "../Navbar";
import {
  createGameSocket,
  setGameSocketListener,
} from "../lib/gameSocket";
import playImage from "../../img/Screenshot From 2026-06-02 16-06-45.png";

export default function Play(){
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const matchmakingRequestSentRef = useRef(false);
  const queuedInitGameOnOpenRef = useRef<(() => void) | null>(null);
  const queuedInitGameSocketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const user = localStorage.getItem("chessgo_user");

    if (!user) {
      router.replace("/");
      return;
    }

    setIsAuthorized(true);
  }, [router]);

  useEffect(() => {
    const sendActiveGameRequest = (ws: WebSocket) => {
      const accessToken = localStorage.getItem("chessgo_access_token")
      const user = JSON.parse(localStorage.getItem("chessgo_user") ?? "{}")
      ws.send(JSON.stringify({
        type: "get_active_game",
        payload: {
          accessToken,
          userId: user.id,
        },
      }))
    }

    setGameSocketListener((message) => {
      if (!message?.type) return;

      if (message.type === "game_started" || message.type === "GAME_STARTED") {
        if (message.payload?.gameId) {
          router.push(`/game/${message.payload.gameId}`)
        }
      }

      if (message.type === "WAITING_FOR_OPPONENT") {
        matchmakingRequestSentRef.current = true
        setWaiting(true)
      }

      if (message.type === "MATCHMAKING_CANCELLED") {
        matchmakingRequestSentRef.current = false
        setWaiting(false)
      }
    })

    const ws = createGameSocket()
    let onOpen: (() => void) | null = null

    if (ws.readyState === WebSocket.OPEN) {
      sendActiveGameRequest(ws)
    } else {
      onOpen = () => {
        sendActiveGameRequest(ws)
        ws.removeEventListener("open", onOpen!)
      }
      ws.addEventListener("open", onOpen)
    }

    return () => {
      if (onOpen) {
        ws.removeEventListener("open", onOpen)
      }
      if (queuedInitGameOnOpenRef.current && queuedInitGameSocketRef.current) {
        queuedInitGameSocketRef.current.removeEventListener("open", queuedInitGameOnOpenRef.current)
      }
      queuedInitGameOnOpenRef.current = null
      queuedInitGameSocketRef.current = null
      setGameSocketListener(null)
    }
  }, [router])

  if (!isAuthorized) {
    return null;
  }

  function connectWs() {
    if (matchmakingRequestSentRef.current) {
      return
    }

    matchmakingRequestSentRef.current = true
    setWaiting(true)

    const ws = createGameSocket()
    const accessToken = localStorage.getItem("chessgo_access_token")
    const user = JSON.parse(localStorage.getItem("chessgo_user") ?? "{}")
    const initGameMessage = JSON.stringify({
      type: "init_game",
      payload: {
        accessToken,
        userId: user.id,
      },
    })

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(initGameMessage)
      return
    }

    if (ws.readyState === WebSocket.CONNECTING) {
      const onOpen = () => {
        ws.send(initGameMessage)
        queuedInitGameOnOpenRef.current = null
        queuedInitGameSocketRef.current = null
        ws.removeEventListener("open", onOpen)
      }
      ws.addEventListener("open", onOpen)
      queuedInitGameOnOpenRef.current = onOpen
      queuedInitGameSocketRef.current = ws
      return
    }

    const onOpen = () => {
      ws.send(initGameMessage)
      queuedInitGameOnOpenRef.current = null
      queuedInitGameSocketRef.current = null
      ws.removeEventListener("open", onOpen)
    }
    ws.addEventListener("open", onOpen)
    queuedInitGameOnOpenRef.current = onOpen
    queuedInitGameSocketRef.current = ws
  }

  function cancelMatchmaking() {
    if (queuedInitGameOnOpenRef.current && queuedInitGameSocketRef.current) {
      queuedInitGameSocketRef.current.removeEventListener("open", queuedInitGameOnOpenRef.current)
      queuedInitGameOnOpenRef.current = null
      queuedInitGameSocketRef.current = null
      matchmakingRequestSentRef.current = false
      setWaiting(false)
      return
    }

    const ws = createGameSocket()
    const accessToken = localStorage.getItem("chessgo_access_token")
    const user = JSON.parse(localStorage.getItem("chessgo_user") ?? "{}")
    const cancelMessage = JSON.stringify({
      type: "cancel_matchmaking",
      payload: {
        accessToken,
        userId: user.id,
      },
    })

    matchmakingRequestSentRef.current = false
    setWaiting(false)

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(cancelMessage)
      return
    }

    if (ws.readyState === WebSocket.CONNECTING) {
      ws.addEventListener("open", function onOpen() {
        ws.send(cancelMessage)
        ws.removeEventListener("open", onOpen)
      })
    }
  }

  return(
    <main className="min-h-screen bg-neutral-950 text-white">
      <Navbar />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 shadow-2xl shadow-black/30 md:grid-cols-2">
          <div className="relative min-h-72 bg-neutral-950 md:min-h-[32rem]">
            <Image
              src={playImage}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              alt="Chess match preview"
              fill
              priority
              className="object-cover"
            />
          </div>

          <div className="flex flex-col justify-center px-6 py-10 text-center md:px-12 md:text-left">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-400">
              Ready to play
            </p>
            <h1 className="mt-3 text-4xl font-semibold">Find a Match</h1>
            <p className="mt-4 text-sm leading-6 text-neutral-300">
              Join the matchmaking queue and start a live chess game as soon as
              an opponent is found.
            </p>
            {waiting && (
              <p className="mt-6 text-sm font-medium text-neutral-200">
                Waiting for opponent...
              </p>
            )}
            <div className="mt-8">
              <Button onclick={connectWs} disabled={waiting}>
                {waiting ? "Waiting..." : "Play"}
              </Button>
              {waiting && (
                <button
                  type="button"
                  onClick={cancelMatchmaking}
                  className="mt-4 rounded border border-neutral-600 px-6 py-3 text-sm font-semibold text-neutral-100 transition hover:border-red-400 hover:text-red-300 md:ml-4 md:mt-0"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
