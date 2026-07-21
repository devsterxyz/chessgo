import type WebSocket from "ws"
import { randomUUID } from "crypto"
import jwt from "jsonwebtoken"
import { Game, type TimeControl } from "./Game.js"
import {
  CANCEL_MATCHMAKING,
  DRAW_ACCEPT,
  DRAW_DECLINE,
  DRAW_OFFER,
  GET_ACTIVE_GAME,
  INIT_GAME,
  MOVE,
  RESIGN_GAME,
  RESUME_GAME,
} from "./messages.js"

type PendingUser = {
  socket: WebSocket
  userId: number
  timeControl: TimeControl
  rated: boolean
}

const timeControls: Record<string, TimeControl> = {
  "1+0": { id: "1+0", label: "1 min", initialTimeMs: 1 * 60 * 1000, incrementMs: 0 },
  "1+1": { id: "1+1", label: "1 + 1", initialTimeMs: 1 * 60 * 1000, incrementMs: 1 * 1000 },
  "2+1": { id: "2+1", label: "2 + 1", initialTimeMs: 2 * 60 * 1000, incrementMs: 1 * 1000 },
  "3+0": { id: "3+0", label: "3 min", initialTimeMs: 3 * 60 * 1000, incrementMs: 0 },
  "3+2": { id: "3+2", label: "3 + 2", initialTimeMs: 3 * 60 * 1000, incrementMs: 2 * 1000 },
  "5+0": { id: "5+0", label: "5 min", initialTimeMs: 5 * 60 * 1000, incrementMs: 0 },
  "10+0": { id: "10+0", label: "10 min", initialTimeMs: 10 * 60 * 1000, incrementMs: 0 },
  "10+5": { id: "10+5", label: "10 + 5", initialTimeMs: 10 * 60 * 1000, incrementMs: 5 * 1000 },
  "15+10": { id: "15+10", label: "15 + 10", initialTimeMs: 15 * 60 * 1000, incrementMs: 10 * 1000 },
  "1d+0": { id: "1d+0", label: "1 day", initialTimeMs: 24 * 60 * 60 * 1000, incrementMs: 0 },
  "3d+0": { id: "3d+0", label: "3 days", initialTimeMs: 3 * 24 * 60 * 60 * 1000, incrementMs: 0 },
  "7d+0": { id: "7d+0", label: "7 days", initialTimeMs: 7 * 24 * 60 * 60 * 1000, incrementMs: 0 },
}

const defaultTimeControl = timeControls["5+0"]!

export class GameManager{
  private games: Map<string, Game>
  private pendingUsers: Map<string, PendingUser>
  private users: WebSocket[]
  private socketUserIds: Map<WebSocket, number>
  private disconnectedPlayers: Map<string, Set<number>>
  private disconnectTimers: Map<string, NodeJS.Timeout>
  private readonly disconnectGraceMs = 10_000

  constructor(){
    this.games = new Map()
    this.pendingUsers = new Map()
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

    for (const [timeControlId, pendingUser] of this.pendingUsers.entries()) {
      if (pendingUser.socket === socket) {
        this.pendingUsers.delete(timeControlId)
      }
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

  private getTimeControl(timeControlId: unknown): TimeControl {
    if (typeof timeControlId !== "string") return defaultTimeControl
    return timeControls[timeControlId] ?? defaultTimeControl
  }

  private getMatchmakingKey(timeControlId: string, rated: boolean) {
    return `${timeControlId}:${rated ? "rated" : "casual"}`
  }

  private resumeGame(socket: WebSocket, gameId: unknown, accessToken: unknown, fallbackUserId: unknown){
    if (typeof gameId !== "string") return

    const userId = this.authenticateSocket(socket, accessToken, fallbackUserId)
    if (!userId) return

    const game = this.games.get(gameId)

    if (!game || !game.isPlayer(userId)) {
      socket.send(JSON.stringify({
        type: "RESUME_FAILED",
        payload: {},
      }))
      return
    }

    this.reconnectPlayerToGame(gameId, game, userId, socket)
  }

  private reconnectPlayerToGame(gameId: string, game: Game, userId: number, socket: WebSocket){
    const didReplacePlayer = game.replacePlayer(userId, socket)
    if (!didReplacePlayer) return false

    const disconnectedPlayers = this.disconnectedPlayers.get(gameId)
    disconnectedPlayers?.delete(userId)

    if (disconnectedPlayers?.size === 0) {
      this.disconnectedPlayers.delete(gameId)
    }

    const timer = this.disconnectTimers.get(gameId)
    if (timer) {
      clearTimeout(timer)
      this.disconnectTimers.delete(gameId)
    }

    return true
  }

  private sendActiveGame(socket: WebSocket, accessToken: unknown, fallbackUserId: unknown){
    const userId = this.authenticateSocket(socket, accessToken, fallbackUserId)
    if (!userId) return

    const entry = Array.from(this.games.entries()).find(([_id, game]) => game.isPlayer(userId))

    if (!entry) {
      socket.send(JSON.stringify({
        type: "NO_ACTIVE_GAME",
        payload: {},
      }))
      return
    }

    const [gameId, game] = entry
    this.reconnectPlayerToGame(gameId, game, userId, socket)
  }

  private cancelMatchmaking(socket: WebSocket, accessToken: unknown, fallbackUserId: unknown){
    const userId = this.authenticateSocket(socket, accessToken, fallbackUserId)
    if (!userId) return

    for (const [matchmakingKey, pendingUser] of this.pendingUsers.entries()) {
      if (pendingUser.socket === socket || pendingUser.userId === userId) {
        this.pendingUsers.delete(matchmakingKey)
      }
    }

    socket.send(JSON.stringify({
      type: "MATCHMAKING_CANCELLED",
      payload: {},
    }))
  }

  private deleteGame(id: string){
    const game = this.games.get(id)
    game?.dispose()

    const timer = this.disconnectTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.disconnectTimers.delete(id)
    }

    this.disconnectedPlayers.delete(id)
    this.games.delete(id)
  }

  private endGame(id: string, payload: {
    draw: boolean
    winner: "white" | "black" | null
    reason: "player_disconnected" | "both_players_disconnected"
  }){
    const game = this.games.get(id)
    if (!game) return

    this.deleteGame(id)

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

  private getActiveGameForSocket(socket: WebSocket) {
    const userId = this.socketUserIds.get(socket)
    if (!userId) return null

    return Array.from(this.games.values()).find(game =>
      game.isPlayer(userId) && game.getPlayerSocket(userId) === socket
    ) ?? null
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

      if(message.type == GET_ACTIVE_GAME){
        this.sendActiveGame(
          socket,
          message.accessToken ?? message.payload?.accessToken,
          message.userId ?? message.payload?.userId,
        )
      }

      if(message.type == CANCEL_MATCHMAKING){
        this.cancelMatchmaking(
          socket,
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
        const timeControl = this.getTimeControl(message.timeControlId ?? message.payload?.timeControlId)
        const rated = Boolean(message.rated ?? message.payload?.rated)
        const matchmakingKey = this.getMatchmakingKey(timeControl.id, rated)

        const activeGame = Array.from(this.games.entries()).find(([_id, game]) => game.isPlayer(userId))
        if (activeGame) {
          const [gameId, game] = activeGame
          this.reconnectPlayerToGame(gameId, game, userId, socket)
          return
        }

        const pendingUser = this.pendingUsers.get(matchmakingKey)
        if(pendingUser){
          if (pendingUser.userId === userId) {
            this.pendingUsers.set(matchmakingKey, { socket, userId, timeControl, rated })
            socket.send(JSON.stringify({
              type: "WAITING_FOR_OPPONENT",
              payload: {
                timeControl,
                rated,
              },
            }))
            return
          }

          const gameId = randomUUID()
          const game = new Game(
            gameId,
            pendingUser.socket,
            socket,
            pendingUser.userId,
            userId,
            timeControl,
            (finishedGameId) => this.deleteGame(finishedGameId),
          )
          this.games.set(gameId, game)
          this.pendingUsers.delete(matchmakingKey)
        }
        else{
          this.pendingUsers.set(matchmakingKey, { socket, userId, timeControl, rated })
          socket.send(JSON.stringify({
            type: "WAITING_FOR_OPPONENT",
            payload: {
              timeControl,
              rated,
            },
          }))
        }
      }

      if(message.type == MOVE){
        const game = this.getActiveGameForSocket(socket)
        if(game){
          const didEndGame = game.makeMove(socket, message.move)
          if (didEndGame) {
            this.deleteGame(game.id)
          }
        }
      }

      if(message.type == RESIGN_GAME){
        const game = this.getActiveGameForSocket(socket)
        if(game){
          const didEndGame = game.resign(socket)
          if (didEndGame) {
            this.deleteGame(game.id)
          }
        }
      }

      if(message.type == DRAW_OFFER){
        const game = this.getActiveGameForSocket(socket)
        if(game){
          const didEndGame = game.offerDraw(socket)
          if (didEndGame) {
            this.deleteGame(game.id)
          }
        }
      }

      if(message.type == DRAW_ACCEPT){
        const game = this.getActiveGameForSocket(socket)
        if(game){
          const didEndGame = game.acceptDraw(socket)
          if (didEndGame) {
            this.deleteGame(game.id)
          }
        }
      }

      if(message.type == DRAW_DECLINE){
        const game = this.getActiveGameForSocket(socket)
        if(game){
          game.declineDraw(socket)
        }
      }
    })
  }
}
