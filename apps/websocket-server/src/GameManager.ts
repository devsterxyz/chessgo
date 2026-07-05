import type WebSocket from "ws"
import { randomUUID } from "crypto"
import jwt from "jsonwebtoken"
import { Game } from "./Game.js"
import { INIT_GAME, MOVE, RESUME_GAME } from "./messages.js"

type PendingUser = {
  socket: WebSocket
  userId: number
}

export class GameManager{
  private games: Map<string, Game>
  private pendingUser: PendingUser | null
  private users: WebSocket[]
  private socketUserIds: Map<WebSocket, number>
  private disconnectedPlayers: Map<string, Set<number>>
  private disconnectTimers: Map<string, NodeJS.Timeout>
  private readonly disconnectGraceMs = 10_000

  constructor(){
    this.games = new Map()
    this.pendingUser = null
    this.users = []
    this.socketUserIds = new Map()
    this.disconnectedPlayers = new Map()
    this.disconnectTimers = new Map()
  }

  addUser(socket: WebSocket){
    this.users.push(socket)
    this.addHandler(socket)
  }

  removeUser(socket: WebSocket){
    this.users = this.users.filter(user => user != socket)
    const userId = this.socketUserIds.get(socket)
    this.socketUserIds.delete(socket)

    if (this.pendingUser?.socket === socket) {
      this.pendingUser = null
    }

    if (!userId) return

    const entry = Array.from(this.games.entries()).find(([_id, game]) =>
      game.isPlayer(userId) && game.getPlayerSocket(userId) === socket
    )

    if (entry) {
      const [id, game] = entry
      const disconnectedPlayers = this.disconnectedPlayers.get(id) ?? new Set<number>()
      disconnectedPlayers.add(userId)
      this.disconnectedPlayers.set(id, disconnectedPlayers)

      if (disconnectedPlayers.has(game.player1Id) && disconnectedPlayers.has(game.player2Id)) {
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
          if (!latestGame || !latestDisconnectedPlayers?.has(userId)) {
            return
          }

          const winner = latestGame.getOpponentColor(userId)
          if (!winner) return

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

  private getUserIdFromAuth(accessToken: unknown, fallbackUserId: unknown){
    const jwtSecret = process.env.JWT_SECRET_KEY
    if (typeof accessToken === "string" && accessToken.trim() !== "" && jwtSecret) {
      try {
        const decoded = jwt.verify(accessToken, jwtSecret) as jwt.JwtPayload & { userId?: number }
        if (typeof decoded.userId === "number") {
          return decoded.userId
        }
      } catch {
        // Fall back to the stored user id below so an expired token does not break local matchmaking.
      }
    }

    const numericUserId =
      typeof fallbackUserId === "number" ? fallbackUserId : Number(fallbackUserId)

    return Number.isFinite(numericUserId) && numericUserId > 0 ? numericUserId : null
  }

  private authenticateSocket(socket: WebSocket, accessToken: unknown, fallbackUserId: unknown){
    const userId = this.getUserIdFromAuth(accessToken, fallbackUserId)
    if (!userId) {
      socket.send(JSON.stringify({
        type: "AUTH_ERROR",
        payload: {
          message: "Invalid access token",
        },
      }))
      return null
    }

    this.socketUserIds.set(socket, userId)
    return userId
  }

  private resumeGame(socket: WebSocket, gameId: unknown, accessToken: unknown, fallbackUserId: unknown){
    if (typeof gameId !== "string") return

    const userId = this.authenticateSocket(socket, accessToken, fallbackUserId)
    if (!userId) return

    const game = this.games.get(gameId)
    const disconnectedPlayers = this.disconnectedPlayers.get(gameId)

    if (!game || !disconnectedPlayers?.has(userId)) {
      socket.send(JSON.stringify({
        type: "RESUME_FAILED",
        payload: {},
      }))
      return
    }

    if (!game.replacePlayer(userId, socket)) {
      socket.send(JSON.stringify({
        type: "RESUME_FAILED",
        payload: {},
      }))
      return
    }

    disconnectedPlayers.delete(userId)

    const timer = this.disconnectTimers.get(gameId)
    if (timer) {
      clearTimeout(timer)
      this.disconnectTimers.delete(gameId)
    }

    if (disconnectedPlayers.size === 0) {
      this.disconnectedPlayers.delete(gameId)
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

      if(message.type == RESUME_GAME){
        this.resumeGame(
          socket,
          message.gameId ?? message.payload?.gameId,
          message.accessToken ?? message.payload?.accessToken,
          message.userId ?? message.payload?.userId,
        )
      }

      if(message.type == INIT_GAME){
        const userId = this.authenticateSocket(
          socket,
          message.accessToken ?? message.payload?.accessToken,
          message.userId ?? message.payload?.userId,
        )
        if (!userId) return

        if(this.pendingUser){
          const gameId = randomUUID()
          const game = new Game(gameId, this.pendingUser.socket, socket, this.pendingUser.userId, userId)
          this.games.set(gameId, game)
          this.pendingUser = null
        }
        else{
          this.pendingUser = { socket, userId }
          socket.send(JSON.stringify({
            type: "WAITING_FOR_OPPONENT",
            payload: {},
          }))
        }
      }

      if(message.type == MOVE){
        const userId = this.socketUserIds.get(socket)
        if (!userId) return

        const game = Array.from(this.games.values()).find(game =>
          game.isPlayer(userId) && game.getPlayerSocket(userId) === socket
        )
        if(game){
          game.makeMove(socket, message.move)
        }
      }
    })
  }
}
