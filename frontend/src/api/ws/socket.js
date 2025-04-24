let socket = null

// Decodes JWT and extracts user ID
export function getUserIdFromToken() {
  try {
    const token = localStorage.getItem("token")
    if (!token) return null
    const payload = JSON.parse(atob(token.split(".")[1]))
    return payload?.id || null
  } catch (err) {
    console.error("Error decoding token:", err)
    return null
  }
}

export function connectToSocket(onIncomingMessage) {
  const userId = getUserIdFromToken()
  if (!userId) return

  socket = new WebSocket("ws://localhost:4000")

  socket.addEventListener("open", () => {
    socket.send(JSON.stringify({ type: "init", userId }))
    console.log("✅ WebSocket connected as", userId)
  })

  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data)
    if (data.type === "message" && typeof onIncomingMessage === "function") {
      onIncomingMessage(data)
    }
  })

  socket.addEventListener("error", (err) => {
    console.error("❌ WebSocket error:", err)
  })

  socket.addEventListener("close", () => {
    console.log("🔌 WebSocket disconnected")
  })
}

export function sendMessage(to, encryptedMessage) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    const userId = getUserIdFromToken()
    socket.send(JSON.stringify({
      type: "message",
      from: userId,
      to,
      encryptedMessage,
    }))
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.close()
    socket = null
  }
}