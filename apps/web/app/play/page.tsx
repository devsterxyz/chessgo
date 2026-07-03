"use client"
import { ChessBoard } from "@repo/ui/ChessBoard";
import { Button } from "@repo/ui/Button"
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Navbar } from "../Navbar";

export default function Play(){
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [fen, setFen] = useState(new Chess().fen());
  const [playerColor, setPlayerColor] = useState<"white" | "black" | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [game_end, setGame_end] = useState(false);
  const [gameResult, setGameResult] = useState("Game Over");
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const user = localStorage.getItem("chessgo_user");

    if (!user) {
      router.replace("/");
      return;
    }

    setIsAuthorized(true);
  }, [router]);

  if (!isAuthorized) {
    return null;
  }

  function connectWs() {
    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    )
      return;

    const ws = new WebSocket("ws://localhost:8080")

    ws.onopen = () => {
      console.log("Connected to WebSocket server")
      ws.send(
        JSON.stringify({
          type: "init_game",
          payload: {},
        })
      )
    }

    ws.onmessage = (event) => {
      console.log("Received:", event.data)
      const message = JSON.parse(event.data)
      switch (message.type) {
        case "game_started":
        case "GAME_STARTED":
          setPlayerColor(message.payload.color)
          setFen(message.payload?.fen ?? new Chess().fen())
          setGameStarted(true)
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
              : "Game Over";
          setGameResult(result);
          setGame_end(true);
          break
      }
    }

    ws.onerror = (error) => {
      console.error("WebSocket error:", error)
    }

    ws.onclose = () => {
      console.log("Connection closed")
      socketRef.current = null
    }
    socketRef.current = ws
  }
  function restartGame() {
    setGame_end(false);
    setGameResult("Game Over");
    setGameStarted(false);
    setFen(new Chess().fen());
    setPlayerColor(null);

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    connectWs();
  }

  return(
    <main className="min-h-screen bg-neutral-950 text-white">
      <Navbar />
      <div className="flex justify-center px-4">
        <div className="pt-8 max-w-screen-lg w-full">
          <div className="grid grid-cols-6 gap-4 w-full">
            <div className="col-span-4 w-full flex justify-center">
              <div className="relative">
                <ChessBoard
                  position={fen}
                  playerColor={playerColor}
                  onMove={(from, to, promotion) => {
                    const move: { from: string; to: string; promotion?: string } = {
                      from,
                      to,
                    };
                    if (promotion) move.promotion = promotion;
                    socketRef.current?.send(
                      JSON.stringify({
                        type: "move",
                        move,
                      })
                    );
                  }}
                />

                {game_end && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-6 text-center shadow-2xl">
                      <h2 className="mb-3 text-2xl font-semibold">Game Over</h2>
                      <p className="mb-6 text-lg text-slate-300">{gameResult}</p>
                      <div className="flex justify-center gap-3">
                        <Button onclick={restartGame}>Rematch</Button>
                        <button
                          onClick={() => setGame_end(false)}
                          className="rounded bg-slate-700 px-6 py-3 font-semibold text-white hover:bg-slate-600"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="col-span-2 bg-slate-800 w-full flex justify-center">
              <div className='pt-8'>
                <Button onclick={connectWs}>
                  Play
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
