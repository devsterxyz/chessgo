import { Chess } from "chess.js";
import type WebSocket from "ws";
import { GAME_STARTED, INIT_GAME } from "./messages.js";


export class Game{
  public player1: WebSocket
  public player2: WebSocket
  public board: Chess
  public moveCount = 0

  constructor(player1: WebSocket, player2: WebSocket){
    this.player1 = player1
    this.player2 = player2
    this.board = new Chess()
    this.player1.send(JSON.stringify({
      type: GAME_STARTED,
      payload: {
        color: "white"
      }
    }))
    this.player2.send(JSON.stringify({
      type: GAME_STARTED,
      payload: {
        color: "black"
      }
    }))
  }

  makeMove(socket: WebSocket, move: {
    from: string
    to: string
    promotion?: "q" | "r" | "b" | "n"
  }){
    if(this.moveCount % 2 === 0 && socket !== this.player1){
      console.log("early return 1")
      return
    }
    if(this.moveCount%2 === 1 && socket !== this.player2){
      console.log("early return 2")
      return
    }
    console.log("did not early return")

    try {
      const result = this.board.move(move);
      if (!result) {
        console.log("Illegal move");
        return;
      }
      this.moveCount++;

      // Send the move to both players
      const message = JSON.stringify({
        type: "MOVE",
        payload: {
          move: result,
          fen: this.board.fen(),
        },
      });
      this.player1.send(message);
      this.player2.send(message);

        if (this.board.isGameOver()) {
          const gameOverMessage = JSON.stringify({
            type: "GAME_OVER",
            payload: {
              checkmate: this.board.isCheckmate(),
              draw: this.board.isDraw(),
              winner: this.board.isCheckmate()
              ? this.board.turn() === "w"? "black": "white": null,
            },
          });

          this.player1.send(gameOverMessage);
          this.player2.send(gameOverMessage);
        }
      }
      catch (err) {
        console.log("Invalid move:", err);
      }
  }
}