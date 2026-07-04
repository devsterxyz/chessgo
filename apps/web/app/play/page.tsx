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

    return () => {
      setGameSocketListener(null)
    }
  }, [router])

  if (!isAuthorized) {
    return null;
  }

  function connectWs() {
    const ws = createGameSocket()

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "init_game", payload: {} }))
      setWaiting(true)
      return
    }

    if (ws.readyState === WebSocket.CONNECTING) {
      ws.addEventListener("open", function onOpen() {
        ws.send(JSON.stringify({ type: "init_game", payload: {} }))
        setWaiting(true)
        ws.removeEventListener("open", onOpen)
      })
      return
    }

    ws.addEventListener("open", function onOpen() {
      ws.send(JSON.stringify({ type: "init_game", payload: {} }))
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
