import { Chess } from "chess.js";
import type WebSocket from "ws";
import { GAME_STARTED } from "./messages.js";

type PlayerColor = "white" | "black"

type GameOverPayload = {
  checkmate?: boolean
  draw: boolean
  winner: PlayerColor | null
  reason?: "checkmate" | "draw" | "timeout" | "resign"
}

export type TimeControl = {
  id: string
  label: string
  initialTimeMs: number
  incrementMs: number
}

export class Game{
  public id: string
  public player1: WebSocket
  public player2: WebSocket
  public player1Id: number
  public player2Id: number
  public board: Chess
  public moveCount = 0
  private whiteTimeMs: number
  private blackTimeMs: number
  private lastTurnStartedAt = Date.now()
  private timeoutTimer: NodeJS.Timeout | null = null
  private gameEnded = false
  private pendingDrawOfferBy: PlayerColor | null = null
  private onGameOver: (gameId: string) => void

  constructor(
    id: string,
    player1: WebSocket,
    player2: WebSocket,
    player1Id: number,
    player2Id: number,
    private readonly timeControl: TimeControl,
    onGameOver: (gameId: string) => void,
  ){
    this.id = id
    this.player1 = player1
    this.player2 = player2
    this.player1Id = player1Id
    this.player2Id = player2Id
    this.onGameOver = onGameOver
    this.whiteTimeMs = timeControl.initialTimeMs
    this.blackTimeMs = timeControl.initialTimeMs
    this.board = new Chess()
    const initialFen = this.board.fen()
    const route = `/game/${this.id}`
    const clock = this.getClockState()

    this.sendToSocket(this.player1, JSON.stringify({
      type: GAME_STARTED,
      payload: {
        color: "white",
        gameId: this.id,
        route,
        fen: initialFen,
        timeControl,
        ...clock,
      }
    }))
    this.sendToSocket(this.player2, JSON.stringify({
      type: GAME_STARTED,
      payload: {
        color: "black",
        gameId: this.id,
        route,
        fen: initialFen,
        timeControl,
        ...clock,
      }
    }))

    this.scheduleTurnTimeout()
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

  getPlayerColorBySocket(socket: WebSocket): PlayerColor | null {
    if (socket === this.player1) return "white"
    if (socket === this.player2) return "black"
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
        timeControl: this.timeControl,
        ...this.getClockState(),
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

  private getActiveColor(): PlayerColor {
    return this.board.turn() === "w" ? "white" : "black"
  }

  private getOpponentColorByColor(color: PlayerColor): PlayerColor {
    return color === "white" ? "black" : "white"
  }

  private getClockState() {
    const now = Date.now()
    const activeColor = this.getActiveColor()
    const elapsedMs = this.gameEnded ? 0 : now - this.lastTurnStartedAt

    return {
      whiteTimeMs: Math.max(
        0,
        this.whiteTimeMs - (activeColor === "white" ? elapsedMs : 0),
      ),
      blackTimeMs: Math.max(
        0,
        this.blackTimeMs - (activeColor === "black" ? elapsedMs : 0),
      ),
      activeColor,
      drawOfferBy: this.pendingDrawOfferBy,
      serverTimeMs: now,
    }
  }

  private applyElapsedTime() {
    const now = Date.now()
    const elapsedMs = now - this.lastTurnStartedAt

    if (this.getActiveColor() === "white") {
      this.whiteTimeMs = Math.max(0, this.whiteTimeMs - elapsedMs)
    } else {
      this.blackTimeMs = Math.max(0, this.blackTimeMs - elapsedMs)
    }

    this.lastTurnStartedAt = now
  }

  private scheduleTurnTimeout() {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer)
    }

    if (this.gameEnded) return

    const activeColor = this.getActiveColor()
    const remainingMs = activeColor === "white" ? this.whiteTimeMs : this.blackTimeMs

    this.timeoutTimer = setTimeout(() => {
      this.expireOnTime(activeColor)
    }, Math.max(0, remainingMs))
  }

  private expireOnTime(color: PlayerColor) {
    if (this.gameEnded || this.getActiveColor() !== color) return

    this.applyElapsedTime()
    this.endGame({
      draw: false,
      winner: this.getOpponentColorByColor(color),
      reason: "timeout",
    })
  }

  private endGame(payload: GameOverPayload) {
    if (this.gameEnded) return

    this.applyElapsedTime()
    this.gameEnded = true
    this.pendingDrawOfferBy = null
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer)
      this.timeoutTimer = null
    }

    const gameOverMessage = JSON.stringify({
      type: "GAME_OVER",
      payload: {
        ...payload,
        ...this.getClockState(),
      },
    });

    this.sendToSocket(this.player1, gameOverMessage);
    this.sendToSocket(this.player2, gameOverMessage);
    this.onGameOver(this.id)
  }

  private sendDrawMessage(type: string, payload: Record<string, unknown>) {
    const message = JSON.stringify({
      type,
      payload: {
        ...payload,
        ...this.getClockState(),
      },
    })

    this.sendToSocket(this.player1, message)
    this.sendToSocket(this.player2, message)
  }

  dispose() {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer)
      this.timeoutTimer = null
    }
  }

  resign(socket: WebSocket) {
    if (this.gameEnded) return false

    const resigningColor = this.getPlayerColorBySocket(socket)
    if (!resigningColor) return false

    this.endGame({
      draw: false,
      winner: this.getOpponentColorByColor(resigningColor),
      reason: "resign",
    })
    return true
  }

  offerDraw(socket: WebSocket) {
    if (this.gameEnded) return false

    const offeringColor = this.getPlayerColorBySocket(socket)
    if (!offeringColor) return false

    if (this.pendingDrawOfferBy === this.getOpponentColorByColor(offeringColor)) {
      return this.acceptDraw(socket)
    }

    this.pendingDrawOfferBy = offeringColor
    this.sendDrawMessage("DRAW_OFFER", {
      offeredBy: offeringColor,
    })
    return false
  }

  acceptDraw(socket: WebSocket) {
    if (this.gameEnded) return false

    const acceptingColor = this.getPlayerColorBySocket(socket)
    if (!acceptingColor || !this.pendingDrawOfferBy) return false
    if (this.pendingDrawOfferBy === acceptingColor) return false

    this.endGame({
      draw: true,
      winner: null,
      reason: "draw",
    })
    return true
  }

  declineDraw(socket: WebSocket) {
    if (this.gameEnded) return false

    const decliningColor = this.getPlayerColorBySocket(socket)
    if (!decliningColor || !this.pendingDrawOfferBy) return false
    if (this.pendingDrawOfferBy === decliningColor) return false

    const offeredBy = this.pendingDrawOfferBy
    this.pendingDrawOfferBy = null
    this.sendDrawMessage("DRAW_DECLINED", {
      offeredBy,
      declinedBy: decliningColor,
    })
    return false
  }

  makeMove(socket: WebSocket, move: {
    from: string
    to: string
    promotion?: "q" | "r" | "b" | "n"
  }){
    if (this.gameEnded) return false

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
      this.applyElapsedTime()

      const activeColor = this.getActiveColor()
      const activeTimeMs = activeColor === "white" ? this.whiteTimeMs : this.blackTimeMs
      if (activeTimeMs <= 0) {
        this.endGame({
          draw: false,
          winner: this.getOpponentColorByColor(activeColor),
          reason: "timeout",
        })
        return true
      }

      const result = this.board.move(move);
      if (!result) {
        console.log("Illegal move");
        this.lastTurnStartedAt = Date.now()
        this.scheduleTurnTimeout()
        return false;
      }
      if (activeColor === "white") {
        this.whiteTimeMs += this.timeControl.incrementMs
      } else {
        this.blackTimeMs += this.timeControl.incrementMs
      }
      this.moveCount++;
      this.pendingDrawOfferBy = null
      this.lastTurnStartedAt = Date.now()

      // Send the move to both players
      const message = JSON.stringify({
        type: "MOVE",
        payload: {
          move: result,
          fen: this.board.fen(),
          ...this.getClockState(),
        },
      });
      this.sendToSocket(this.player1, message);
      this.sendToSocket(this.player2, message);

        if (this.board.isGameOver()) {
          this.endGame({
            checkmate: this.board.isCheckmate(),
            draw: this.board.isDraw(),
            winner: this.board.isCheckmate()
            ? this.board.turn() === "w"? "black": "white": null,
            reason: this.board.isCheckmate() ? "checkmate" : "draw",
          })
          return true
        }

        this.scheduleTurnTimeout()
      }
      catch (err) {
        console.log("Invalid move:", err);
        this.lastTurnStartedAt = Date.now()
        this.scheduleTurnTimeout()
      }
      return false
  }
}
