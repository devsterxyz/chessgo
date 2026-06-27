import { WebSocketServer } from "ws";
import { GameManager } from "./GameManager.js";
import express from "express";

let app = express()

app.listen(3000, (err?: NodeJS.ErrnoException)=>{
  if(err){
    console.log(err)
  }
  console.log(`Server running on port 3000`)
})

import userRouter from './routes/user.routes.js'

app.use('/user', userRouter)

const wss = new WebSocketServer({ port: 8080 });
const gameManager = new GameManager();

wss.on('connection', function connection(ws){
  gameManager.addUser(ws)
  ws.on("disconnect", () => gameManager.removeUser(ws))
})

console.log("WebSocket server running on ws://localhost:8080");

