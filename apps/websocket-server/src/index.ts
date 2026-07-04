import { WebSocketServer } from "ws";
import { GameManager } from "./GameManager.js";
import express from "express";
import userRouter from './routes/user.routes.js'

let app = express()
const httpPort = Number(process.env.PORT ?? 3002)
const websocketPort = Number(process.env.WS_PORT ?? 8080)

app.use((req, res, next) => {
  const origin = req.headers.origin

  if (origin && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
    res.header("Access-Control-Allow-Origin", origin)
    res.header("Access-Control-Allow-Credentials", "true")
  }

  res.header("Access-Control-Allow-Headers", "Content-Type")
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")

  if (req.method === "OPTIONS") {
    return res.sendStatus(204)
  }

  next()
})

app.use(express.json())

app.listen(httpPort, () => {
  console.log(`Server running on port ${httpPort}`)
}).on("error", (err: NodeJS.ErrnoException) => {
  console.error(`HTTP server failed on port ${httpPort}:`, err.message)
})

app.use('/user', userRouter)

const wss = new WebSocketServer({ port: websocketPort });
const gameManager = new GameManager();

wss.on('connection', function connection(ws) {
  gameManager.addUser(ws)
  ws.on("close", () => gameManager.removeUser(ws))
})

wss.on("listening", () => {
  console.log(`WebSocket server running on ws://localhost:${websocketPort}`);
})

wss.on("error", (err: NodeJS.ErrnoException) => {
  console.error(`WebSocket server failed on port ${websocketPort}:`, err.message)
})
