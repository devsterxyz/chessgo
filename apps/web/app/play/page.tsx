"use client"
import { ChessBoard } from "@repo/ui/ChessBoard";
import { Button } from "@repo/ui/Button"
import { useRef, useState } from "react";
import { Chess } from "chess.js";

export default function Play(){
  const [fen, setFen] = useState(new Chess().fen());
  const [playerColor, setPlayerColor] = useState<"white" | "black" | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
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
          alert("Game Over")
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
  return(
    <div className="flex justify-center">
      <div className="pt-8 max-w-screen-lg w-full">
        <div className="grid grid-cols-6 gap-4 w-full">
          <div className="col-span-4  w-full flex justify-center">
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
  )
}
