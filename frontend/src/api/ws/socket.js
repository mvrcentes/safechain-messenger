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
  if (!userId || socket?.readyState === WebSocket.OPEN) return

  socket = new WebSocket("ws://localhost:4000")

  socket.addEventListener("open", () => {
    socket.send(JSON.stringify({ type: "init", userId }))
    console.log("✅ WebSocket connected as", userId)
  })

  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data)
    if (typeof onIncomingMessage === "function" && (data.type === "message" || data.type === "group-message")) {
      onIncomingMessage(data)
    }
  })

  socket.addEventListener("error", (err) => {
    console.error("❌ WebSocket error:", err)
  })

  socket.addEventListener("close", () => {
    console.warn("🔌 WebSocket closed. Attempting reconnect in 2s...")
    socket = null
    setTimeout(() => connectToSocket(onIncomingMessage), 2000)
  })
}

export function sendMessage(to, content) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    const userId = getUserIdFromToken()
    socket.send(
      JSON.stringify({
        type: "message",
        from: userId,
        to,
        content,
      })
    )
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.close()
    socket = null
  }
}
