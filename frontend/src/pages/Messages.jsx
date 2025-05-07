import React, { useEffect, useState, useRef } from "react"
import GroupDropdown from "@/components/group/GroupDropdown"
import {
  connectToSocket,
  sendMessage,
  disconnectSocket,
  getUserIdFromToken,
  sendGroupSocketMessage,
} from "@/api/ws/socket"
import { getAllUsers } from "../api/user/user"
import { getMessagesWithUser } from "../api/message/message"
import { getUserGroups } from "../api/user/group"
import { getPublicEncryptKeyByUserId } from "../api/user/user"
import { encryptWithPublicKey, decryptWithPrivateKey } from "../lib/crypto"
import KeySheet from "./KeySheet"
import { toast } from "sonner"

const colors = [
  "text-red-500",
  "text-green-500",
  "text-yellow-500",
  "text-purple-500",
  "text-pink-500",
  "text-indigo-500",
  "text-emerald-500",
  "text-cyan-500",
  "text-orange-500",
]

const getColorForUser = (id) => {
  const numericId =
    typeof id === "string"
      ? id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
      : id
  return colors[numericId % colors.length]
}

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
  const [groups, setGroups] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [privateEncryptKey, setPrivateEncryptKey] = useState("")

  useEffect(() => {
    selectedUserIdRef.current = selectedUserId
  }, [selectedUserId])

  // Helper to decrypt only new incoming messages (stable definition)
  const decryptIfNeeded = async (msg, key) => {
    if (!msg.incoming || !key?.trim()) return msg
    try {
      const decrypted = await decryptWithPrivateKey(key, msg.content)
      console.log("Intentando descifrar:", msg.content)
      return { ...msg, decryptedContent: decrypted }
    } catch (err) {
      console.error("❌ Error decrypting incoming message:", err)
      return msg
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return

    const currentUserId = getUserIdFromToken()
    if (!currentUserId) return

    connectToSocket(async (data) => {
      const currentUserId = getUserIdFromToken()
      const selectedId = selectedUserIdRef.current

      const isGroupMessage = typeof data.groupId === "number"
      const isDirectMessage =
        data.toUserId === currentUserId || data.fromUserId === currentUserId

      let selectedGroupId = null
      if (typeof selectedId === "string" && selectedId.startsWith("group-")) {
        const parts = selectedId.split("group-")
        if (parts.length > 1) {
          selectedGroupId = parseInt(parts[1])
        }
      }

      const isRelevant =
        (isGroupMessage && selectedGroupId === data.groupId) ||
        (isDirectMessage &&
          (data.toUserId === selectedId || data.fromUserId === selectedId))

      if (!isRelevant) return

      const incoming = data.fromUserId !== currentUserId

      // Use latest privateEncryptKey for decryption
      const baseMsg = { ...data, incoming }
      let finalMsg = baseMsg

      if (privateEncryptKey?.trim() && incoming) {
        finalMsg = await decryptIfNeeded(baseMsg, privateEncryptKey)
      }

      setMessages((prev) => {
        const alreadyExists = prev.some((m) => m.id === finalMsg.id)
        if (alreadyExists) return prev
        return [...prev, finalMsg]
      })
    })

    // Fetch all users for inbox
    getAllUsers()
      .then((users) => {
        const currentUserId = getUserIdFromToken()
        const selfUser = { id: currentUserId, name: "You" }
        setUsers([...users, selfUser])
      })
      .catch((err) => console.error("❌ Error fetching users:", err))

    getUserGroups()
      .then(setGroups)
      .catch((err) => console.error("❌ Error fetching groups:", err))

    return () => disconnectSocket()
  }, [])

  useEffect(() => {
    if (!selectedUserId) return

    getMessagesWithUser(selectedUserId)
      .then((fetchedMessages) => {
        const currentUserId = getUserIdFromToken()

        const processedMessages = fetchedMessages.map((msg) => ({
          ...msg,
          incoming: msg.groupId
            ? msg.fromUserId !== currentUserId // ✅ si es grupo, entrante si NO soy yo
            : msg.toUserId === currentUserId, // ✅ si es directo, entrante si soy el destinatario
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

  const handleSend = async () => {
    if (!selectedUserId || !input.trim()) return

    const isGroup =
      typeof selectedUserId === "string" && selectedUserId.startsWith("group-")
    const content = input
    const fromUserId = getUserIdFromToken()

    if (isGroup) {
      const groupId = parseInt(selectedUserId.split("group-")[1])
      sendGroupSocketMessage(groupId, content) // 🔐 ← grupo todavía sin cifrado individual
    } else {
      try {
        const publicKey = await getPublicEncryptKeyByUserId(selectedUserId)
        const encrypted = await encryptWithPublicKey(publicKey, content)

        sendMessage(selectedUserId, encrypted)

        setMessages((prev) => [
          ...prev,
          {
            fromUserId,
            toUserId: selectedUserId,
            content: encrypted,
            incoming: false,
            createdAt: new Date().toISOString(),
            id: crypto.randomUUID(),
          },
        ])
      } catch (err) {
        console.error("❌ Error encrypting or sending message:", err)
      }
    }

    setInput("")
  }

  const handlePrivateKey = (key) => {
    if (!key?.trim()) {
      toast.warning(
        "🔐 Clave eliminada. Los mensajes volverán a mostrarse cifrados."
      )
    } else {
      toast.success(
        "🔓 Clave privada importada. Los mensajes nuevos se descifrarán."
      )
    }
    setPrivateEncryptKey(key)
  }

  useEffect(() => {
    const decryptMessages = async () => {
      if (!privateEncryptKey?.trim()) return

      const updated = await Promise.all(
        messages.map((msg) => decryptIfNeeded(msg, privateEncryptKey))
      )
      setMessages(updated)
    }

    decryptMessages()
  }, [privateEncryptKey])

  useEffect(() => {
    if (!privateEncryptKey?.trim()) {
      // Clave eliminada, restauramos los mensajes al estado cifrado
      setMessages((prev) => prev.map(({ decryptedContent, ...msg }) => msg))
    }
  }, [privateEncryptKey])

  return (
    <div className="flex flex-row flex-1 w-full gap-2 px-4 pb-4 bg-background text-foreground overflow-hidden">
      {/* INBOX SIDEBAR */}
      <div className="w-[300px] bg-muted/20 backdrop-blur-sm border border-border text-muted-foreground p-4 rounded-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Inbox</h2>
          <GroupDropdown />
        </div>

        {users.length > 0 && (
          <div className="space-y-2 mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Users
            </h3>
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className={`text-left px-4 py-2 rounded-lg w-full ${
                  selectedUserId === user.id
                    ? "bg-muted text-foreground"
                    : "hover:bg-muted/30"
                }`}>
                {user.name}
              </button>
            ))}
          </div>
        )}

        {groups.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Groups
            </h3>
            {groups.map((group) => (
              <button
                key={`group-${group.id}`}
                onClick={() => setSelectedUserId(`group-${group.id}`)}
                className={`text-left px-4 py-2 rounded-lg w-full ${
                  selectedUserId === `group-${group.id}`
                    ? "bg-muted text-foreground"
                    : "hover:bg-muted/30"
                }`}>
                {group.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CHAT PANEL */}
      <div className="flex-1 flex flex-col p-6 bg-muted/10 border border-border rounded-xl overflow-hidden">
        {selectedUserId ? (
          <>
            <div className="flex">
              <h2 className="text-xl font-semibold mb-4">
                Chat with {users.find((u) => u.id === selectedUserId)?.name}
              </h2>

              <KeySheet onPrivateEncryptKeyLoaded={handlePrivateKey} />
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-2">
              {messages
                .filter((msg) => {
                  const isGroupSelected =
                    typeof selectedUserId === "string" &&
                    selectedUserId.startsWith("group-")

                  if (isGroupSelected) {
                    const groupId = parseInt(selectedUserId.split("group-")[1])
                    return msg.groupId === groupId
                  } else {
                    return (
                      !msg.groupId &&
                      (msg.fromUserId === selectedUserId ||
                        msg.toUserId === selectedUserId)
                    )
                  }
                })
                .map((msg, idx) => (
                  <div
                    key={idx}
                    className={`w-fit max-w-[75%] px-4 py-2 rounded-lg break-words ${
                      msg.incoming
                        ? "bg-muted text-foreground mr-auto"
                        : "bg-primary text-primary-foreground ml-auto"
                    }`}>
                    {typeof selectedUserId === "string" &&
                      selectedUserId.startsWith("group-") && (
                        <div
                          className={`text-xs font-semibold mb-1 ${
                            msg.fromUserId === getUserIdFromToken()
                              ? "text-blue-500"
                              : getColorForUser(msg.fromUserId)
                          }`}>
                          {msg.fromUserId === getUserIdFromToken()
                            ? "You"
                            : users.find((u) => u.id === msg.fromUserId)
                                ?.name || "Unknown"}
                        </div>
                      )}
                    {msg.decryptedContent || msg.content}
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
