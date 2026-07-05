import { Chess } from "chess.js";
import type WebSocket from "ws";
import { GAME_STARTED } from "./messages.js";

export class Game{
  public id: string
  public player1: WebSocket
  public player2: WebSocket
  public player1Id: number
  public player2Id: number
  public board: Chess
  public moveCount = 0

  constructor(id: string, player1: WebSocket, player2: WebSocket, player1Id: number, player2Id: number){
    this.id = id
    this.player1 = player1
    this.player2 = player2
    this.player1Id = player1Id
    this.player2Id = player2Id
    this.board = new Chess()
    const initialFen = this.board.fen()
    const route = `/game/${this.id}`

    this.sendToSocket(this.player1, JSON.stringify({
      type: GAME_STARTED,
      payload: {
        color: "white",
        gameId: this.id,
        route,
        fen: initialFen,
      }
    }))
    this.sendToSocket(this.player2, JSON.stringify({
      type: GAME_STARTED,
      payload: {
        color: "black",
        gameId: this.id,
        route,
        fen: initialFen,
      }
    }))
  }

  replacePlayer(userId: number, socket: WebSocket){
    if (userId === this.player1Id) {
      this.player1 = socket
      this.sendState(socket, "white")
      return true
    }

    if (userId === this.player2Id) {
      this.player2 = socket
      this.sendState(socket, "black")
      return true
    }

    return false
  }

  isPlayer(userId: number){
    return userId === this.player1Id || userId === this.player2Id
  }

  getPlayerSocket(userId: number){
    if (userId === this.player1Id) return this.player1
    if (userId === this.player2Id) return this.player2
    return null
  }

  getOpponentColor(userId: number){
    if (userId === this.player1Id) return "black"
    if (userId === this.player2Id) return "white"
    return null
  }

  private sendState(socket: WebSocket, color: "white" | "black"){
    this.sendToSocket(socket, JSON.stringify({
      type: GAME_STARTED,
      payload: {
        color,
        gameId: this.id,
        route: `/game/${this.id}`,
        fen: this.board.fen(),
        moveCount: this.moveCount,
      }
    }))
  }

  private sendToSocket(socket: WebSocket, message: string){
    try {
      socket.send(message)
    } catch {
      // The socket may be temporarily disconnected while the game is resumable.
    }
  }

  makeMove(socket: WebSocket, move: {
    from: string
    to: string
    promotion?: "q" | "r" | "b" | "n"
  }){
    if(this.moveCount % 2 === 0 && socket !== this.player1){
      console.log("early return 1")
      return false
    }
    if(this.moveCount%2 === 1 && socket !== this.player2){
      console.log("early return 2")
      return false
    }
    console.log("did not early return")

    try {
      const result = this.board.move(move);
      if (!result) {
        console.log("Illegal move");
        return false;
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
      this.sendToSocket(this.player1, message);
      this.sendToSocket(this.player2, message);

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

          this.sendToSocket(this.player1, gameOverMessage);
          this.sendToSocket(this.player2, gameOverMessage);
          return true
        }
      }
      catch (err) {
        console.log("Invalid move:", err);
      }
      return false
  }
}
