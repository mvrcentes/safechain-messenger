import chalk from "chalk"
import prisma from "../database.js"
import { createBlockchainEntry } from "../controllers/blockchain/blockchain.controller.js"
import sanitizeHtml from "sanitize-html"

const clients = new Map()

export function setupWebSocket(wss) {
  wss.on("connection", (ws) => {
    console.log(chalk.blue("📡 New WebSocket connection"))

    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data)

        if (msg.type === "init") {
          // Save the connection under the userId
          clients.set(msg.userId, ws)
          console.log(chalk.green(`✅ Registered client: ${msg.userId}`))
          return
        }

        // Single direct message
        if (msg.type === "message") {
          const { to, from, content } = msg

          // Sanitize incoming message content to prevent XSS
          const cleanContent = sanitizeHtml(content || "", {
            allowedTags: [],         // strip all HTML tags
            allowedAttributes: {},   // no attributes allowed
          })

          const savedMessage = await prisma.message.create({
            data: {
              fromUserId: from,
              toUserId: to,
              content: cleanContent,
            },
          })

          createBlockchainEntry(savedMessage.id, cleanContent).catch((err) =>
            console.error("❌ Error registrando en blockchain:", err)
          )

          const recipient = clients.get(to)
          if (recipient) {
            recipient.send(
              JSON.stringify({
                type: "message",
                fromUserId: from,
                toUserId: to,
                content: cleanContent,
                id: savedMessage.id,
                createdAt: savedMessage.createdAt,
              })
            )
          }
          return
        }

        // Group message
        if (msg.type === "group-message") {
          const { from, groupId, content } = msg

          // Sanitize group message content
          const cleanContent = sanitizeHtml(content || "", {
            allowedTags: [],
            allowedAttributes: {},
          })

          const savedMessage = await prisma.message.create({
            data: {
              fromUserId: from,
              groupId,
              content: cleanContent,
            },
          })

          createBlockchainEntry(savedMessage.id, cleanContent).catch((err) =>
            console.error("❌ Error registrando en blockchain (grupo):", err)
          )

          const group = await prisma.group.findUnique({
            where: { id: groupId },
            include: { members: true },
          })

          if (group && Array.isArray(group.members)) {
            for (const member of group.members) {
              const client = clients.get(member.id)
              if (client) {
                client.send(
                  JSON.stringify({
                    type: "group-message",
                    fromUserId: from,
                    groupId,
                    content: cleanContent,
                    id: savedMessage.id,
                    createdAt: savedMessage.createdAt,
                  })
                )
              }
            }
          }
          return
        }

        // Disconnect message (optional)
        if (msg.type === "disconnect") {
          clients.delete(msg.userId)
          console.log(chalk.gray(`👋 Disconnected client: ${msg.userId}`))
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
