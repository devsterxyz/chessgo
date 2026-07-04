"use client"

let socket: WebSocket | null = null
let messageListener: ((message: any) => void) | null = null
let lastGameStartedMessage: any = null

export function createGameSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket
  }

  socket = new WebSocket("ws://localhost:8080")

  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data)
      if (message?.type === "game_started" || message?.type === "GAME_STARTED") {
        lastGameStartedMessage = message
      }
      messageListener?.(message)
    } catch (error) {
      console.error("Failed to parse socket message", error)
    }
  })

  socket.addEventListener("close", () => {
    socket = null
  })

  socket.addEventListener("error", (event) => {
    console.error("WebSocket error", event)
  })

  return socket
}

export function getGameSocket() {
  return socket
}

export function getLastGameStartedMessage() {
  return lastGameStartedMessage
}

export function sendGameSocketMessage(message: any) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return
  }

  socket.send(JSON.stringify(message))
}

export function setGameSocketListener(listener: ((message: any) => void) | null) {
  messageListener = listener
}

export function closeGameSocket() {
  if (!socket) return
  socket.close()
  socket = null
  messageListener = null
  lastGameStartedMessage = null
}
