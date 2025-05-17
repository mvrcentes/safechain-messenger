import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCheck } from "@fortawesome/free-solid-svg-icons"
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
import { getSigningPublicKeyByUserId } from "../api/user/user"
import { encryptWithPublicKey, decryptWithPrivateKey } from "../lib/crypto"
import KeySheet, { SigningKeySheet } from "./KeySheet"
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
  const [privateSigningKey, setPrivateSigningKey] = useState(null)
  const privateEncryptKeyRef = useRef("")
  const publicSigningKeyRef = useRef(null)
  const originalMessagesRef = useRef([])

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

  const signIfPossible = async (content, signingKey) => {
    const encryptionKey = privateEncryptKeyRef.current

    if (!signingKey || signingKey === encryptionKey) {
      console.warn("🚫 No signing key available or trying to use encryption key for signing.")
      console.log("🧪 signingKey:", signingKey)
      console.log("🧪 encryptionKey:", encryptionKey)
      return null
    }

    try {
      const encoded = new TextEncoder().encode(content)
      const sigBuf = await window.crypto.subtle.sign(
        { name: "RSASSA-PKCS1-v1_5" },
        signingKey,
        encoded
      )
      const signature = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
      console.log("✅ Mensaje firmado correctamente con clave de firma:", signature)
      return signature
    } catch (err) {
      console.error("❌ Error al firmar:", err)
      return null
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

      // --- Signature verification logic ---
      let signatureValid = false
      if (incoming && data.signature && data.content) {
        try {
          const senderPublicKeyPem = await getSigningPublicKeyByUserId(data.fromUserId)
          const keyData = atob(senderPublicKeyPem.replace(/-----[^-]+-----|\n/g, ""))
          const keyBuffer = new Uint8Array([...keyData].map((c) => c.charCodeAt(0)))
          const publicKey = await window.crypto.subtle.importKey(
            "spki",
            keyBuffer,
            {
              name: "RSASSA-PKCS1-v1_5",
              hash: "SHA-256",
            },
            true,
            ["verify"]
          )

          const encoded = new TextEncoder().encode(data.content)
          const sigBytes = Uint8Array.from(atob(data.signature), (c) => c.charCodeAt(0))

          signatureValid = await window.crypto.subtle.verify(
            { name: "RSASSA-PKCS1-v1_5" },
            publicKey,
            sigBytes,
            encoded
          )
          console.log("✅ Firma verificada:", signatureValid)
        } catch (err) {
          console.error("❌ Error verificando firma:", err)
        }
      }
      // --- End signature verification logic ---

      // Use latest privateEncryptKey for decryption
      const baseMsg = { ...data, incoming }
      let finalMsg = baseMsg

      // Always add signatureValid property to finalMsg
      finalMsg = { ...finalMsg, signatureValid }

      const key = privateEncryptKeyRef.current
      if (incoming) {
        finalMsg = await decryptIfNeeded(finalMsg, key)
      }

      setMessages((prev) => {
        const alreadyExists = prev.some((m) => m.id === finalMsg.id)
        if (alreadyExists) return prev
        originalMessagesRef.current = [...originalMessagesRef.current, { ...baseMsg, signatureValid }]
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
          const combined = [...prevMessages, ...newMessages].sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          )
          originalMessagesRef.current = combined // guardar siempre el original
          return combined
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
    let signature = null
    let encrypted = content

    if (isGroup) {
      const groupId = parseInt(selectedUserId.split("group-")[1])
      // Aquí faltaría lógica para cifrado de grupo, dejamos como plano
    } else {
      try {
        const publicKey = await getPublicEncryptKeyByUserId(selectedUserId)
        encrypted = await encryptWithPublicKey(publicKey, content)
      } catch (err) {
        console.error("❌ Error encrypting message:", err)
      }
    }

    signature = await signIfPossible(encrypted, privateSigningKey)

    if (signature && publicSigningKeyRef.current) {
      const encoded = new TextEncoder().encode(encrypted)
      const isValid = await window.crypto.subtle.verify(
        { name: "RSASSA-PKCS1-v1_5" },
        publicSigningKeyRef.current,
        Uint8Array.from(atob(signature), (c) => c.charCodeAt(0)),
        encoded
      )
      if (!isValid) {
        toast.error("❌ Firma no válida con llave pública.")
        return
      }
    }

    if (isGroup) {
      const groupId = parseInt(selectedUserId.split("group-")[1])
      sendGroupSocketMessage(groupId, encrypted, signature) // 🔐 ← grupo todavía sin cifrado individual
    } else {
      try {
        sendMessage(selectedUserId, encrypted, signature)

        setMessages((prev) => [
          ...prev,
          {
            fromUserId,
            toUserId: selectedUserId,
            content: encrypted,
            signature,
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
      setPrivateSigningKey(null)
    } else {
      toast.success(
        "🔓 Clave privada importada. Los mensajes nuevos se descifrarán."
      )
    }
    setPrivateEncryptKey(key)
  }

  useEffect(() => {
    const decryptMessages = async () => {
      const baseMessages = originalMessagesRef.current

      if (!privateEncryptKey?.trim()) {
        // Si no hay clave, mostrar mensajes cifrados
        setMessages(baseMessages)
      } else {
        // Si hay clave, mostrar mensajes descifrados
        const decrypted = await Promise.all(
          baseMessages.map((msg) => decryptIfNeeded(msg, privateEncryptKey))
        )
        setMessages(decrypted)
      }
    }

    decryptMessages()
  }, [privateEncryptKey])

  useEffect(() => {
    if (!privateEncryptKey?.trim()) {
      // Clave eliminada, restauramos los mensajes al estado cifrado
      setMessages((prev) => prev.map(({ ...msg }) => msg))
    }
  }, [privateEncryptKey])

  useEffect(() => {
    privateEncryptKeyRef.current = privateEncryptKey
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
              <SigningKeySheet
                onPrivateEncryptKeyLoaded={(key) => {
                  if (!key?.trim()) {
                    toast.warning("🔏 Clave de firma eliminada.")
                    setPrivateSigningKey(null)
                  } else {
                    const keyData = atob(key.replace(/-----[^-]+-----|\n/g, ""))
                    const keyBuffer = new Uint8Array(
                      [...keyData].map((char) => char.charCodeAt(0))
                    )
                    window.crypto.subtle
                      .importKey(
                        "pkcs8",
                        keyBuffer,
                        {
                          name: "RSASSA-PKCS1-v1_5",
                          hash: "SHA-256",
                        },
                        true,
                        ["sign"]
                      )
                      .then((importedKey) => {
                        setPrivateSigningKey(importedKey)
                        return getSigningPublicKeyByUserId(getUserIdFromToken())
                      })
                      .then((publicKeyPem) => {
                        const keyData = atob(publicKeyPem.replace(/-----[^-]+-----|\n/g, ""))
                        const keyBuffer = new Uint8Array([...keyData].map((c) => c.charCodeAt(0)))
                        return window.crypto.subtle.importKey(
                          "spki",
                          keyBuffer,
                          {
                            name: "RSASSA-PKCS1-v1_5",
                            hash: "SHA-256",
                          },
                          true,
                          ["verify"]
                        )
                      })
                      .then((publicKey) => {
                        publicSigningKeyRef.current = publicKey
                      })
                      .catch((err) => {
                        console.error("❌ Error importando clave de firma o pública:", err)
                        toast.error("❌ No se pudo importar la clave de firma o pública.")
                      })
                  }
                }}
              />
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
                            : users.find((u) => u.id === msg.fromUserId)?.name || "Unknown"}
                        </div>
                    )}
                    {msg.decryptedContent || msg.content}
                    {!msg.incoming && (
                      <FontAwesomeIcon
                        icon={faCheck}
                        style={{
                          color: msg.signature ? "#63E6BE" : "#ff2600",
                          marginLeft: "8px",
                        }}
                      />
                    )}
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
