import chalk from "chalk"

import prisma from "../../database.js"
import { extractUserFromToken } from "../../lib/utils.js"

export const createGroup = async (req, res) => {
  const user = extractUserFromToken(req)
  console.log("user", user)

  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const { name, memberIds } = req.body
  console.log("name", name)
  console.log("memberIds", memberIds)
  if (!name || !Array.isArray(memberIds)) {
    return res.status(400).json({ error: "Missing group name or member IDs" })
  }

  try {
    const crypto = await import("crypto")
    const symmetricKeyBuffer = crypto.randomBytes(32) // 256-bit key
    const symmetricKey = symmetricKeyBuffer.toString("base64")

    const group = await prisma.group.create({
      data: {
        name,
        symmetricKey,
        members: {
          connect: [...memberIds.map((id) => ({ id })), { id: user.id }],
        },
      },
    })

    console.log(chalk.green(`✅ Group created: ${group.name}`))
    res.status(201).json(group)
  } catch (err) {
    console.error(chalk.red("❌ Error creating group:"), err)
    res.status(500).json({ error: "Failed to create group" })
  }
}

export const getUserGroups = async (req, res) => {
  const user = extractUserFromToken(req)
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  try {
    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: { id: user.id },
        },
      },
      include: {
        members: true,
      },
    })

    console.log(chalk.blue(`📦 Groups fetched for user ${user.id}`))
    res.json(groups)
  } catch (err) {
    console.error(chalk.red("❌ Error fetching groups:"), err)
    res.status(500).json({ error: "Failed to fetch groups" })
  }
}

export const sendGroupMessage = async (req, res) => {
  const user = extractUserFromToken(req)
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const groupId = parseInt(req.params.groupId)
  const { content } = req.body

  if (!content || !groupId) {
    return res.status(400).json({ error: "Missing message content or groupId" })
  }

  try {
    const message = await prisma.message.create({
      data: {
        fromUserId: user.id,
        groupId,
        content,
      },
    })

    console.log(chalk.cyan(`💬 Message sent to group ${groupId}`))
    res.status(201).json(message)
  } catch (err) {
    console.error(chalk.red("❌ Error sending group message:"), err)
    res.status(500).json({ error: "Failed to send message" })
  }
}
