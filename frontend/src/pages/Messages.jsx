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
import {
  encryptWithPublicKey,
  decryptWithPrivateKey,
  decryptAESGCM,
  encryptAESGCM,
} from "../lib/crypto"
import KeySheet, { SigningKeySheet } from "./KeySheet"
import { toast } from "sonner"
import KGroupDialog from "@/components/group/KGroupDialog"
import { prepareKGroupForDecryption } from "@/lib/x3dh/prepareKGroup"

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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogGroupId, setDialogGroupId] = useState(null)

  useEffect(() => {
    selectedUserIdRef.current = selectedUserId
  }, [selectedUserId])

  // Helper to decrypt only new incoming messages (stable definition)
  const decryptIfNeeded = async (msg, key) => {
    // 🟢 Mensaje de grupo
    if (msg.groupId) {
      const groupKeyBase64 = localStorage.getItem(`k_group_${msg.groupId}`)
      if (!groupKeyBase64) return msg

      const groupKey = Uint8Array.from(atob(groupKeyBase64), (c) =>
        c.charCodeAt(0)
      )

      try {
        const decrypted = await decryptAESGCM(msg.content, groupKey)
        return { ...msg, decryptedContent: decrypted }
      } catch (err) {
        console.error("❌ Error descifrando mensaje de grupo:", err)
        return msg
      }
    }

    // 🔒 Mensaje directo
    if (!key?.trim()) return msg
    try {
      const decrypted = await decryptWithPrivateKey(key, msg.content)
      return { ...msg, decryptedContent: decrypted }
    } catch (err) {
      console.error("❌ Error decrypting direct message:", err)
      return msg
    }
  }

  const signIfPossible = async (content, signingKey) => {
    const encryptionKey = privateEncryptKeyRef.current

    if (!signingKey || signingKey === encryptionKey) {
      console.warn(
        "🚫 No signing key available or trying to use encryption key for signing."
      )
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
      console.log(
        "✅ Mensaje firmado correctamente con clave de firma:",
        signature
      )
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

      // Use latest privateEncryptKey for decryption
      const baseMsg = { ...data, incoming }
      let finalMsg = baseMsg

      if (incoming) {
        // 🔄 Nuevo: Pasamos null si es grupo para que lo intente con k_group
        const keyOrNull = baseMsg.groupId ? null : privateEncryptKeyRef.current
        finalMsg = await decryptIfNeeded(baseMsg, keyOrNull)
      }

      setMessages((prev) => {
        const alreadyExists = prev.some((m) => m.id === finalMsg.id)
        if (alreadyExists) return prev
        originalMessagesRef.current = [...originalMessagesRef.current, baseMsg]
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
    const content = input.trim()
    setInput("")
    const fromUserId = getUserIdFromToken()

    // Signature logic only for direct (non-group) messages
    let signature = null

    if (!isGroup) {
      signature = await signIfPossible(content, privateSigningKey)

      if (signature && publicSigningKeyRef.current) {
        const encoded = new TextEncoder().encode(content)
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
    }

    if (isGroup) {
      const groupId = parseInt(selectedUserId.split("group-")[1])
      const groupKeyBase64 = localStorage.getItem(`k_group_${groupId}`)
      if (!groupKeyBase64) {
        toast.error("🔐 No se encontró la clave del grupo.")
        return
      }

      console.log(
        "🧪 Clave base64 del grupo:",
        localStorage.getItem(`k_group_${groupId}`)
      )

      if (
        !groupKeyBase64 ||
        typeof groupKeyBase64 !== "string" ||
        groupKeyBase64.trim() === ""
      ) {
        console.error(
          "⚠️ groupKeyBase64 está vacío o malformado:",
          groupKeyBase64
        )
        toast.error("⚠️ No se encontró una clave válida para este grupo.")
        return
      }

      const groupKey = Uint8Array.from(atob(groupKeyBase64), (c) =>
        c.charCodeAt(0)
      )

      const plaintextBytes = new TextEncoder().encode(content)
      const encryptedContent = await encryptAESGCM(plaintextBytes, groupKey)

      sendGroupSocketMessage(groupId, encryptedContent, signature)
      setMessages((prev) => [
        ...prev,
        {
          groupId,
          fromUserId,
          content: encryptedContent,
          decryptedContent: content, // 👈 esta es la línea que hace que se vea el mensaje descifrado
          incoming: false,
          createdAt: new Date().toISOString(),
          id: crypto.randomUUID(),
        },
      ])
    } else {
      try {
        const publicKey = await getPublicEncryptKeyByUserId(selectedUserId)
        const encrypted = await encryptWithPublicKey(publicKey, content)

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
          baseMessages.map((msg) =>
            decryptIfNeeded(msg, msg.groupId ? null : privateEncryptKey)
          )
        )
        setMessages(decrypted)
      }
    }

    decryptMessages()
  }, [privateEncryptKey])

  useEffect(() => {
    const reprocessGroupMessages = async () => {
      if (!selectedUserId || typeof selectedUserId !== "string") return

      const isGroup = selectedUserId.startsWith("group-")
      if (!isGroup) return

      const groupId = parseInt(selectedUserId.split("group-")[1])
      const base64Key = localStorage.getItem(`k_group_${groupId}`)
      if (!base64Key) return

      const baseMessages = originalMessagesRef.current

      const updated = await Promise.all(
        baseMessages.map((msg) =>
          decryptIfNeeded(msg, msg.groupId ? null : privateEncryptKey)
        )
      )
      setMessages(updated)
    }

    reprocessGroupMessages()
  }, [selectedUserId])

  useEffect(() => {
    if (!privateEncryptKey?.trim()) {
      // Clave eliminada, restauramos los mensajes al estado cifrado
      setMessages((prev) => prev.map(({ ...msg }) => msg))
    }
  }, [privateEncryptKey])

  useEffect(() => {
    privateEncryptKeyRef.current = privateEncryptKey
  }, [privateEncryptKey])

  // Dialog state for group key downloa

  useEffect(() => {
    const testDecrypt = async () => {
      const messageBase64 = "NLmLvDOkwArmI9oRYoGT03tXFoVyW2szXXrVrozLmiA="
      const keyBase64 = "g5/Z4RMV2giO6eGHhkE3pLcxhvtZmhaRMgiFORLHSM4="
      const encrypted = Uint8Array.from(atob(messageBase64), (c) =>
        c.charCodeAt(0)
      )
      const iv = encrypted.slice(0, 12)
      const ciphertext = encrypted.slice(12)
      const key = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0))

      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        key,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      )

      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        ciphertext
      )

      console.log("🟢 Mensaje descifrado:", new TextDecoder().decode(decrypted))
    }

    testDecrypt()
  }, [])

  useEffect(() => {
    if (!selectedUserId) return

    const isGroup =
      typeof selectedUserId === "string" && selectedUserId.startsWith("group-")

    if (!isGroup) return

    const groupId = parseInt(selectedUserId.split("group-")[1])
    prepareKGroupForDecryption(groupId, setDialogGroupId, setDialogOpen)
  }, [selectedUserId])

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
                    toast.success("🔏 Clave de firma importada correctamente.")
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
                        const keyData = atob(
                          publicKeyPem.replace(/-----[^-]+-----|\n/g, "")
                        )
                        const keyBuffer = new Uint8Array(
                          [...keyData].map((c) => c.charCodeAt(0))
                        )
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
                        toast.success(
                          "🗝️ Llave pública para verificar cargada."
                        )
                      })
                      .catch((err) => {
                        console.error(
                          "❌ Error importando clave de firma o pública:",
                          err
                        )
                        toast.error(
                          "❌ No se pudo importar la clave de firma o pública."
                        )
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
                            : users.find((u) => u.id === msg.fromUserId)
                                ?.name || "Unknown"}
                        </div>
                      )}
                    {
                      msg.incoming
                        ? msg.decryptedContent || msg.content // Si lo recibiste, intenta descifrar
                        : msg.decryptedContent // Si tú lo enviaste, solo muestra descifrado
                    }
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

      <KGroupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        groupId={dialogGroupId}
      />
    </div>
  )
}

export default Messages
