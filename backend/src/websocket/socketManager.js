import chalk from "chalk"
import prisma from "../database.js"
import { createBlockchainEntry } from "../controllers/blockchain/blockchain.controller.js"
import sanitizeHtml from "sanitize-html"

const clients = new Map()

// Reusable sanitize options (OWASP: XSS defense)
const SANITIZE_OPTS = { allowedTags: [], allowedAttributes: {} }

// Defensive JSON parse to avoid throwing on malformed frames
function safeJsonParse(data) {
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

function sanitizeContent(raw) {
  return sanitizeHtml(raw || "", SANITIZE_OPTS)
}

function sendJson(ws, payload) {
  try {
    ws && ws.readyState === ws.OPEN && ws.send(JSON.stringify(payload))
  } catch (e) {
    console.error("❌ Error sending WebSocket message:", e)
  }
}

async function persistDirectMessage({ prisma, from, to, content }) {
  const savedMessage = await prisma.message.create({
    data: { fromUserId: from, toUserId: to, content },
  })
  // Fire-and-forget blockchain audit trail
  createBlockchainEntry(savedMessage.id, content).catch((err) =>
    console.error("❌ Error registrando en blockchain:", err)
  )
  return savedMessage
}

async function persistGroupMessage({ prisma, from, groupId, content }) {
  const savedMessage = await prisma.message.create({
    data: { fromUserId: from, groupId, content },
  })
  createBlockchainEntry(savedMessage.id, content).catch((err) =>
    console.error("❌ Error registrando en blockchain (grupo):", err)
  )
  return savedMessage
}

// Basic schema validation (defense-in-depth)
function isObject(x) { return x !== null && typeof x === "object" && !Array.isArray(x) }
function hasKeys(obj, keys) { return keys.every((k) => Object.hasOwn(obj, k)) }

export function setupWebSocket(wss) {
  wss.on("connection", (ws) => {
    console.log(chalk.blue("📡 New WebSocket connection"))

    ws.on("message", async (data) => {
      // Drop overly large frames (simple abuse control, OWASP: Size Limits)
      if (typeof data === "string" && data.length > 10 * 1024) {
        console.warn("⚠️ Dropping oversized WebSocket frame")
        return
      }

      try {
        const msg = safeJsonParse(data)
        if (!isObject(msg) || typeof msg.type !== "string") return

        switch (msg.type) {
          case "init": {
            if (!hasKeys(msg, ["userId"])) return
            clients.set(msg.userId, ws)
            console.log(chalk.green(`✅ Registered client: ${msg.userId}`))
            return
          }

          case "message": {
            if (!hasKeys(msg, ["from", "to", "content"])) return
            const cleanContent = sanitizeContent(msg.content)
            const saved = await persistDirectMessage({
              prisma,
              from: msg.from,
              to: msg.to,
              content: cleanContent,
            })
            const recipient = clients.get(msg.to)
            if (recipient) {
              sendJson(recipient, {
                type: "message",
                fromUserId: msg.from,
                toUserId: msg.to,
                content: cleanContent,
                id: saved.id,
                createdAt: saved.createdAt,
              })
            }
            return
          }

          case "group-message": {
            if (!hasKeys(msg, ["from", "groupId", "content"])) return
            const cleanContent = sanitizeContent(msg.content)
            const saved = await persistGroupMessage({
              prisma,
              from: msg.from,
              groupId: msg.groupId,
              content: cleanContent,
            })
            const group = await prisma.group.findUnique({
              where: { id: msg.groupId },
              include: { members: true },
            })
            if (group && Array.isArray(group.members)) {
              for (const member of group.members) {
                const client = clients.get(member.id)
                if (client) {
                  sendJson(client, {
                    type: "group-message",
                    fromUserId: msg.from,
                    groupId: msg.groupId,
                    content: cleanContent,
                    id: saved.id,
                    createdAt: saved.createdAt,
                  })
                }
              }
            }
            return
          }

          case "disconnect": {
            if (!hasKeys(msg, ["userId"])) return
            clients.delete(msg.userId)
            console.log(chalk.gray(`👋 Disconnected client: ${msg.userId}`))
            return
          }

          default:
            // Unknown message types are ignored to avoid unsafe behavior
            return
        }
      } catch (error) {
        console.error(chalk.red("❌ Error handling message:"), error)
      }
    })

    ws.on("close", () => {
      // Clean up on disconnect
      for (const [userId, clientWs] of clients.entries()) {
        if (clientWs === ws) {
          clients.delete(userId)
          console.log(chalk.red(`❌ WebSocket closed for ${userId}`))
          break
        }
      }
    })
  })
}
