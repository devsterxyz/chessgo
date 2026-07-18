"use client"
import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChessBoard } from "@repo/ui/ChessBoard"
import { Navbar } from "../../Navbar"
import { Chess } from "chess.js"
import {
  createGameSocket,
  getLastGameStartedMessage,
  sendGameSocketMessage,
  setGameSocketListener,
} from "../../lib/gameSocket"

type PlayerColor = "white" | "black"

type ClockState = {
  whiteTimeMs: number
  blackTimeMs: number
  activeColor: PlayerColor
  receivedAtMs: number
}

function normalizePlayerColor(color: unknown): PlayerColor | null {
  if (color === "white" || color === "w") return "white"
  if (color === "black" || color === "b") return "black"
  return null
}

function formatClock(ms: number) {
  const safeMs = Math.max(0, ms)
  const totalSeconds = Math.ceil(safeMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const gameId =
    typeof params.gameId === "string"
      ? params.gameId
      : Array.isArray(params.gameId)
      ? params.gameId[0]
      : undefined
  const [fen, setFen] = useState(new Chess().fen())
  const [playerColor, setPlayerColor] = useState<PlayerColor | null>(null)
  const [connected, setConnected] = useState(false)
  const [gameEnd, setGameEnd] = useState(false)
  const [gameResult, setGameResult] = useState("Game Over")
  const [clock, setClock] = useState<ClockState>({
    whiteTimeMs: 2 * 60 * 1000,
    blackTimeMs: 2 * 60 * 1000,
    activeColor: "white",
    receivedAtMs: Date.now(),
  })
  const [nowMs, setNowMs] = useState(Date.now())

  const syncClock = useCallback((payload: any) => {
    const activeColor = normalizePlayerColor(payload?.activeColor)
    if (
      typeof payload?.whiteTimeMs !== "number" ||
      typeof payload?.blackTimeMs !== "number" ||
      !activeColor
    ) {
      return
    }

    setClock({
      whiteTimeMs: payload.whiteTimeMs,
      blackTimeMs: payload.blackTimeMs,
      activeColor,
      receivedAtMs: Date.now(),
    })
    setNowMs(Date.now())
  }, [])

  useEffect(() => {
    const ws = createGameSocket()
    const sendResumeGame = () => {
      const user = JSON.parse(localStorage.getItem("chessgo_user") ?? "{}")
      ws.send(JSON.stringify({
        type: "resume_game",
        payload: {
          gameId,
          accessToken: localStorage.getItem("chessgo_access_token"),
          userId: user.id,
        },
      }))
    }

    const handleMessage = (message: any) => {
      if (!message?.type) return

      switch (message.type) {
        case "game_started":
        case "GAME_STARTED":
          setPlayerColor(normalizePlayerColor(message.payload?.color))
          setFen(message.payload?.fen ?? new Chess().fen())
          syncClock(message.payload)
          if (message.payload?.gameId && message.payload?.gameId !== gameId) {
            router.replace(`/game/${message.payload?.gameId}`)
          }
          break
        case "move":
        case "MOVE":
          setFen(message.payload?.fen ?? message.fen)
          syncClock(message.payload)
          break
        case "GAME_OVER":
          const result = message.payload?.draw
            ? "Draw"
            : message.payload?.winner
              ? `${message.payload.winner === "white" ? "White" : "Black"} wins${message.payload?.reason === "timeout" ? " on time" : ""}!`
              : "Game Over"
          syncClock(message.payload)
          setGameResult(result)
          setGameEnd(true)
          break
      }
    }

    const lastGameStartedMessage = getLastGameStartedMessage()
    if (
      lastGameStartedMessage?.payload?.gameId === gameId ||
      (!gameId && lastGameStartedMessage?.payload?.gameId)
    ) {
      handleMessage(lastGameStartedMessage)
    }

    setGameSocketListener(handleMessage)

    let onOpen: (() => void) | null = null
    if (ws.readyState === WebSocket.OPEN) {
      setConnected(true)
      sendResumeGame()
    } else {
      onOpen = () => {
        setConnected(true)
        sendResumeGame()
      }
      ws.addEventListener("open", onOpen)
    }

    return () => {
      if (onOpen) {
        ws.removeEventListener("open", onOpen)
      }
      setGameSocketListener(null)
    }
  }, [gameId, router, syncClock])

  useEffect(() => {
    if (!gameId) {
      router.replace("/play")
    }
  }, [gameId, router])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now())
    }, 250)

    return () => window.clearInterval(interval)
  }, [])

  const handleMove = (from: string, to: string, promotion?: string) => {
    if (gameEnd) return

    const move: { from: string; to: string; promotion?: string } = { from, to }
    if (promotion) move.promotion = promotion
    sendGameSocketMessage({
      type: "move",
      move,
    })
  }

  const elapsedMs = gameEnd ? 0 : nowMs - clock.receivedAtMs
  const whiteDisplayMs =
    clock.activeColor === "white" ? clock.whiteTimeMs - elapsedMs : clock.whiteTimeMs
  const blackDisplayMs =
    clock.activeColor === "black" ? clock.blackTimeMs - elapsedMs : clock.blackTimeMs

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <Navbar />
      <div className="flex justify-center px-2 py-4 sm:px-4">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-semibold">Game {gameId}</h1>
            <p className="text-sm text-neutral-400">
              {connected ? "Connected to game" : "Connecting to game..."}
            </p>
          </div>
          <div className="mx-auto mb-4 grid max-w-xl grid-cols-2 overflow-hidden rounded border border-neutral-800 bg-neutral-900">
            <div className={`px-4 py-3 ${clock.activeColor === "white" && !gameEnd ? "bg-emerald-950/50" : ""}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">White</p>
              <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">
                {formatClock(whiteDisplayMs)}
              </p>
            </div>
            <div className={`border-l border-neutral-800 px-4 py-3 text-right ${clock.activeColor === "black" && !gameEnd ? "bg-emerald-950/50" : ""}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Black</p>
              <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">
                {formatClock(blackDisplayMs)}
              </p>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="relative">
              <ChessBoard
                position={fen}
                playerColor={playerColor}
                onMove={handleMove}
              />
              {gameEnd && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                  <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-6 text-center shadow-2xl">
                    <h2 className="mb-3 text-2xl font-semibold">Game Over</h2>
                    <p className="mb-6 text-lg text-slate-300">{gameResult}</p>
                    <button
                      onClick={() => setGameEnd(false)}
                      className="rounded bg-slate-700 px-6 py-3 font-semibold text-white hover:bg-slate-600"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
