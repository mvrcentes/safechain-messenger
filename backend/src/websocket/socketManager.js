import chalk from "chalk"
import prisma from "../database.js"

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

        if (msg.type === "message") {
          const { to, from, content } = msg

          const savedMessage = await prisma.message.create({
            data: {
              fromUserId: from,
              toUserId: to,
              content,
            },
          })

          const recipient = clients.get(to)

          if (recipient) {
            recipient.send(
              JSON.stringify({
                type: "message",
                fromUserId: from,
                toUserId: to,
                content,
                id: savedMessage.id,
                createdAt: savedMessage.createdAt,
              })
            )
          }
        }

        if (msg.type === "group-message") {
          const { from, groupId, content } = msg

          const savedMessage = await prisma.message.create({
            data: {
              fromUserId: from,
              groupId,
              content,
            },
          })

          const group = await prisma.group.findUnique({
            where: { id: groupId },
            include: { members: true },
          })

          for (const member of group.members) {
            const client = clients.get(member.id)
            if (client) {
              client.send(
                JSON.stringify({
                  type: "group-message",
                  fromUserId: from,
                  groupId,
                  content,
                  id: savedMessage.id,
                  createdAt: savedMessage.createdAt,
                })
              )
            }
          }

          return
        }

        if (msg.type === "disconnect") {
          clients.delete(msg.userId)
          console.log(chalk.gray(`👋 Disconnected client: ${msg.userId}`))
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
