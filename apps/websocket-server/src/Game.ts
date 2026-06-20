import { Chess } from "chess.js";
import type WebSocket from "ws";
import { GAME_STARTED, INIT_GAME } from "./messages.js";


export class Game{
  public player1: WebSocket
  public player2: WebSocket
  public board: Chess
  private moveCount = 0;

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
}