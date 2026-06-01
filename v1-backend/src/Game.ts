import { Chess } from "chess.js"
import type WebSocket from "ws"


export class Game {
  public player1: WebSocket
  public player2: WebSocket
  public board: Chess
  private startTime: Date

  constructor(player1: WebSocket, player2: WebSocket){
    this.player1 = player1
    this.player2 = player2
    this.board = new Chess()
    this.startTime = new Date()
  }

  makeMove(socket: WebSocket, move: string){
    if(socket === this.player1 || socket === this.player2){
      // validation here
      // is it this user move
      // is the move valid

      

      // update the board
      // push the move

      // check is the game is over

      // send the updated board to both players
    }
  }
}