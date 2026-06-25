"use client"
import { ChessBoard } from "@repo/ui/ChessBoard";
import { Button } from "@repo/ui/Button"
import { useRef } from "react";

export default function Play(){
  const socketRef = useRef<WebSocket | null>(null);
  function connectWs() {
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
      console.log("Received:", event.data);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("Connection closed");
    };
    socketRef.current = ws
  }
  return(
    <div className="flex justify-center">
      <div className="pt-8 max-w-screen-lg w-full">
        <div className="grid grid-cols-6 gap-4 w-full">
          <div className="col-span-4  w-full flex justify-center">
            <ChessBoard />
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