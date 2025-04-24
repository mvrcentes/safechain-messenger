import React, { useEffect, useState } from "react"
import {
  connectToSocket,
  sendMessage,
  disconnectSocket,
  getUserIdFromToken,
} from "@/api/ws/socket"
import { getAllUsers } from "../api/user/user"

const Messages = () => {
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [users, setUsers] = useState([])

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      console.warn("⚠️ No token found, skipping WebSocket and users call.")
      return
    }

    const userId = getUserIdFromToken()
    if (!userId) {
      console.warn("⚠️ Token exists but userId is invalid, skipping WebSocket.")
      return
    }

    // ✅ Establecer WebSocket con userId válido
    connectToSocket((data) => {
      setMessages((prev) => [...prev, { ...data, incoming: true }])
    })

    // ✅ Llamada para traer los usuarios
    getAllUsers()
      .then((users) => {
        setUsers(users)
      })
      .catch((err) => {
        console.error("❌ Error fetching users:", err)
      })

    // ✅ Cleanup
    return () => {
      disconnectSocket()
      console.log("🔌 WebSocket disconnected on unmount.")
    }
  }, [])

  const handleSend = () => {
    if (!selectedUserId || !input.trim()) return

    sendMessage(selectedUserId, input)
    setMessages((prev) => [
      ...prev,
      { to: selectedUserId, encryptedMessage: input, incoming: false },
    ])
    setInput("")
  }

  return (
    <div className="flex flex-row h-full w-full gap-2 px-4 pb-4 bg-background text-foreground">
      {/* INBOX SIDEBAR */}
      <div className="w-[300px] bg-muted/20 backdrop-blur-sm border border-border text-muted-foreground p-4 rounded-xl flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Inbox</h2>
        {Array.isArray(users) && users.length > 0 ? (
          users.map((user) => (
            <button
              key={user.id}
              onClick={() => setSelectedUserId(user.id)}
              className={`text-left px-4 py-2 rounded-lg ${
                selectedUserId === user.id
                  ? "bg-muted text-foreground"
                  : "hover:bg-muted/30"
              }`}>
              {user.name}
            </button>
          ))
        ) : (
          <p className="text-muted-foreground">No users found.</p>
        )}
      </div>

      {/* CHAT PANEL */}
      <div className="flex-1 p-6 bg-muted/10 border border-border rounded-xl overflow-y-auto flex flex-col">
        {selectedUserId ? (
          <>
            <h2 className="text-xl font-semibold mb-4">
              Chat with {users.find((u) => u.id === selectedUserId)?.name}
            </h2>

            <div className="flex-1 space-y-2 overflow-y-auto">
              {messages
                .filter(
                  (msg) =>
                    msg.from === selectedUserId || msg.to === selectedUserId
                )
                .map((msg, idx) => (
                  <div
                    key={idx}
                    className={`max-w-xl px-4 py-2 rounded-lg ${
                      msg.incoming
                        ? "bg-muted"
                        : "bg-primary text-primary-foreground self-end"
                    }`}>
                    {msg.encryptedMessage}
                  </div>
                ))}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Write a message..."
                className="flex-1 px-4 py-2 border rounded-lg bg-background"
              />
              <button
                onClick={handleSend}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">
                Send
              </button>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">
            Select a user to start chatting.
          </p>
        )}
      </div>
    </div>
  )
}

export default Messages
