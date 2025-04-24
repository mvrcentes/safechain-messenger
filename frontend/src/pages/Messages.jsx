import React, { useEffect, useState, useRef } from "react"
import {
  connectToSocket,
  sendMessage,
  disconnectSocket,
  getUserIdFromToken,
} from "@/api/ws/socket"
import { getAllUsers } from "../api/user/user"
import { getMessagesWithUser } from "../api/message/message"

const Messages = () => {
  const selectedUserIdRef = useRef(null)
  const [messages, setMessages] = useState([])
  // Ref for the end of the messages list
  const messagesEndRef = useRef(null)
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])
  const [input, setInput] = useState("")
  const [users, setUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)

  useEffect(() => {
    selectedUserIdRef.current = selectedUserId
  }, [selectedUserId])

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return

    const currentUserId = getUserIdFromToken()
    if (!currentUserId) return

    connectToSocket((data) => {
      const isRelevant =
        data.fromUserId === currentUserId || data.toUserId === currentUserId

      if (isRelevant) {
        const incoming = data.toUserId === currentUserId
        setMessages((prev) => {
          const alreadyExists = prev.some((m) => m.id === data.id)
          if (alreadyExists) return prev
          return [...prev, { ...data, incoming }]
        })
      }
    })

    // Fetch all users for inbox
    getAllUsers()
      .then((users) => setUsers(users))
      .catch((err) => console.error("❌ Error fetching users:", err))

    return () => disconnectSocket()
  }, [])

  useEffect(() => {
    if (!selectedUserId) return

    getMessagesWithUser(selectedUserId)
      .then((fetchedMessages) => {
        const currentUserId = getUserIdFromToken()

        const processedMessages = fetchedMessages.map((msg) => ({
          ...msg,
          incoming: msg.toUserId === currentUserId, // entrante si el destinatario soy yo
        }))

        setMessages((prevMessages) => {
          const existingIds = new Set(prevMessages.map((m) => m.id))
          const newMessages = processedMessages.filter(
            (m) => !existingIds.has(m.id)
          )
          return [...prevMessages, ...newMessages].sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          )
        })
      })
      .catch((err) => {
        console.error("❌ Error loading message history:", err)
      })
  }, [selectedUserId])

  const handleSend = () => {
    if (!selectedUserId || !input.trim()) return

    sendMessage(selectedUserId, input)
    const fromUserId = getUserIdFromToken()
    setMessages((prev) => [
      ...prev,
      {
        fromUserId,
        toUserId: selectedUserId,
        content: input,
        incoming: false,
        createdAt: new Date().toISOString(),
        id: crypto.randomUUID(), // fake ID until it's replaced by backend fetch
      },
    ])
    setInput("")
  }

  return (
    <div className="flex flex-row flex-1 w-full gap-2 px-4 pb-4 bg-background text-foreground overflow-hidden">
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
      <div className="flex-1 flex flex-col p-6 bg-muted/10 border border-border rounded-xl overflow-hidden">
        {selectedUserId ? (
          <>
            <h2 className="text-xl font-semibold mb-4">
              Chat with {users.find((u) => u.id === selectedUserId)?.name}
            </h2>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-2">
              {messages
                .filter(
                  (msg) =>
                    msg.fromUserId === selectedUserId ||
                    msg.toUserId === selectedUserId
                )
                .map((msg, idx) => (
                  <div
                    key={idx}
                    className={`w-fit max-w-[75%] px-4 py-2 rounded-lg break-words ${
                      msg.incoming
                        ? "bg-muted text-foreground mr-auto"
                        : "bg-primary text-primary-foreground ml-auto"
                    }`}>
                    {msg.content}
                  </div>
                ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && input.trim()) {
                    handleSend()
                  }
                }}
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
