import prisma from "../../database.js"
import { extractUserFromToken } from "../../lib/utils.js"

export async function getMessagesWithUser(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const user = extractUserFromToken(req)
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  try {
    const currentUserId = user.id
    const targetUserId = parseInt(req.params.userId)

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { fromUserId: currentUserId, toUserId: targetUserId },
          { fromUserId: targetUserId, toUserId: currentUserId },
        ],
      },
      orderBy: { createdAt: "asc" },
    })

    res.json(messages)
  } catch (error) {
    console.error("Error fetching messages:", error)
    res.status(500).json({ error: "Failed to fetch messages" })
  }
}
