import http from "node:http"
import { WebSocketServer } from "ws"
import app from "./app.js"
import "./database.js"
import { setupWebSocket } from "./websocket/socketManager.js" // lo crearás

const PORT = app.get("port")
const server = http.createServer(app)

const wss = new WebSocketServer({ server })
setupWebSocket(wss) // lógica de conexión y reenvío de mensajes

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})
