import type WebSocket from "ws"
import { randomUUID } from "crypto"
import { Game } from "./Game.js"
import { INIT_GAME, MOVE } from "./messages.js"

export class GameManager{
  private games: Map<string, Game>
  private pendingUser: WebSocket | null
  private users: WebSocket[]
  private disconnectedPlayers: Map<string, Set<WebSocket>>
  private disconnectTimers: Map<string, NodeJS.Timeout>
  private readonly disconnectGraceMs = 10_000

  constructor(){
    this.games = new Map()
    this.pendingUser = null
    this.users = []
    this.disconnectedPlayers = new Map()
    this.disconnectTimers = new Map()
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
      const disconnectedPlayers = this.disconnectedPlayers.get(id) ?? new Set<WebSocket>()
      disconnectedPlayers.add(socket)
      this.disconnectedPlayers.set(id, disconnectedPlayers)

      if (disconnectedPlayers.has(game.player1) && disconnectedPlayers.has(game.player2)) {
        this.endGame(id, {
          draw: false,
          winner: null,
          reason: "both_players_disconnected",
        })
        return
      }

      if (!this.disconnectTimers.has(id)) {
        const timer = setTimeout(() => {
          const latestGame = this.games.get(id)
          const latestDisconnectedPlayers = this.disconnectedPlayers.get(id)
          if (!latestGame || !latestDisconnectedPlayers?.has(socket)) {
            return
          }

          const winner = latestGame.player1 === socket ? "black" : "white"
          this.endGame(id, {
            draw: false,
            winner,
            reason: "player_disconnected",
          })
        }, this.disconnectGraceMs)

        this.disconnectTimers.set(id, timer)
      }
    }
  }

  private endGame(id: string, payload: {
    draw: boolean
    winner: "white" | "black" | null
    reason: "player_disconnected" | "both_players_disconnected"
  }){
    const game = this.games.get(id)
    if (!game) return

    const timer = this.disconnectTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.disconnectTimers.delete(id)
    }

    this.disconnectedPlayers.delete(id)
    this.games.delete(id)

    const message = JSON.stringify({
      type: "GAME_OVER",
      payload,
    })

    for (const player of [game.player1, game.player2]) {
      try {
        player.send(message)
      } catch {
        // The player may already be disconnected.
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
