"use client"
import { Button } from "@repo/ui/Button"
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Navbar } from "../Navbar";
import {
  createGameSocket,
  setGameSocketListener,
} from "../lib/gameSocket";

export default function Play(){
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [waiting, setWaiting] = useState(false);

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
        setWaiting(true)
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
      setGameSocketListener(null)
    }
  }, [router])

  if (!isAuthorized) {
    return null;
  }

  function connectWs() {
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
      setWaiting(true)
      return
    }

    if (ws.readyState === WebSocket.CONNECTING) {
      ws.addEventListener("open", function onOpen() {
        ws.send(initGameMessage)
        setWaiting(true)
        ws.removeEventListener("open", onOpen)
      })
      return
    }

    ws.addEventListener("open", function onOpen() {
      ws.send(initGameMessage)
      setWaiting(true)
      ws.removeEventListener("open", onOpen)
    })
  }

  return(
    <main className="min-h-screen bg-neutral-950 text-white">
      <Navbar />
      <div className="flex justify-center px-4">
        <div className="pt-8 max-w-5xl w-full">
          <div className="text-center">
            <h1 className="text-4xl font-semibold mb-4">Find a Match</h1>
            <p className="text-sm text-neutral-400 mb-8">
              Click play to join the matchmaking queue. You will be redirected to your game when an opponent is found.
            </p>
            {waiting && (
              <p className="mb-6 text-neutral-300">Waiting for opponent...</p>
            )}
            <Button onclick={connectWs}>
              Play
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
