import type WebSocket from "ws"
import { randomUUID } from "crypto"
import { Game } from "./Game.js"
import { INIT_GAME, MOVE } from "./messages.js"

export class GameManager{
  private games: Map<string, Game>
  private pendingUser: WebSocket | null
  private users: WebSocket[]

  constructor(){
    this.games = new Map()
    this.pendingUser = null
    this.users = []
  }

  addUser(socket: WebSocket){
    this.users.push(socket)
    this.addHandler(socket)
  }

  removeUser(socket: WebSocket){
    this.users = this.users.filter(user => user != socket)

    if (this.pendingUser === socket) {
      this.pendingUser = null
    }

    const entry = Array.from(this.games.entries()).find(([_id, game]) =>
      game.player1 === socket || game.player2 === socket
    )

    if (entry) {
      const [id, game] = entry
      this.games.delete(id)
      const opponent = game.player1 === socket ? game.player2 : game.player1
      try {
        opponent.send(JSON.stringify({
          type: "OPPONENT_DISCONNECTED",
          payload: {},
        }))
      } catch {
        // ignore if opponent already disconnected
      }
    }
  }

  private addHandler(socket: WebSocket){
    socket.on("message", (data)=>{
      const message = JSON.parse(data.toString())
      if(message.type == INIT_GAME){
        if(this.pendingUser){
          const gameId = randomUUID()
          const game = new Game(gameId, this.pendingUser, socket)
          this.games.set(gameId, game)
          this.pendingUser = null
        }
        else{
          this.pendingUser = socket
          socket.send(JSON.stringify({
            type: "WAITING_FOR_OPPONENT",
            payload: {},
          }))
        }
      }

      if(message.type == MOVE){
        const game = Array.from(this.games.values()).find(game =>
          game.player1 === socket || game.player2 === socket
        )
        if(game){
          game.makeMove(socket, message.move)
        }
      }
    })
  }
}
