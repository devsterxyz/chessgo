import { WebSocketServer } from "ws";



const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (socket) => {
  console.log("Client connected");

  socket.send("Hello from Turborepo WebSocket server");

  socket.on("message", (message) => {
    console.log("Received:", message.toString());

    socket.send(`Echo: ${message}`);
  });

  socket.on("close", () => {
    console.log("Client disconnected");
  });
});

console.log("WebSocket server running on ws://localhost:8080");