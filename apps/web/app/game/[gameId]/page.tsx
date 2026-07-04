"use client"
import { useEffect, useState } from "react"
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

function normalizePlayerColor(color: unknown): PlayerColor | null {
  if (color === "white" || color === "w") return "white"
  if (color === "black" || color === "b") return "black"
  return null
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

  useEffect(() => {
    const ws = createGameSocket()

    const handleMessage = (message: any) => {
      if (!message?.type) return

      switch (message.type) {
        case "game_started":
        case "GAME_STARTED":
          setPlayerColor(normalizePlayerColor(message.payload?.color))
          setFen(message.payload?.fen ?? new Chess().fen())
          if (message.payload?.gameId && message.payload?.gameId !== gameId) {
            router.replace(`/game/${message.payload?.gameId}`)
          }
          break
        case "move":
        case "MOVE":
          setFen(message.payload?.fen ?? message.fen)
          break
        case "GAME_OVER":
          const result = message.payload?.draw
            ? "Draw"
            : message.payload?.winner
              ? `${message.payload.winner === "white" ? "White" : "Black"} wins!`
              : "Game Over"
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
    } else {
      onOpen = () => setConnected(true)
      ws.addEventListener("open", onOpen)
    }

    return () => {
      if (onOpen) {
        ws.removeEventListener("open", onOpen)
      }
      setGameSocketListener(null)
    }
  }, [gameId, router])

  useEffect(() => {
    if (!gameId) {
      router.replace("/play")
    }
  }, [gameId, router])

  const handleMove = (from: string, to: string, promotion?: string) => {
    const move: { from: string; to: string; promotion?: string } = { from, to }
    if (promotion) move.promotion = promotion
    sendGameSocketMessage({
      type: "move",
      move,
    })
  }

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
