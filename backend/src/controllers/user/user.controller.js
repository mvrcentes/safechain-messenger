import prisma from "../../database.js"
import { extractUserFromToken } from "../../lib/utils.js"

export const getAllUsers = async (req, res) => {
  const user = extractUserFromToken(req)
  if (!user) return res.status(401).json({ error: "Invalid or missing token" })

  try {
    const currentUser = user.email
    const users = await prisma.user.findMany({
      where: {
        email: { not: currentUser },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    res.status(200).json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}


export const getPublicEncryptKey = async (req, res) => {
  const userId = Number.parseInt(req.params.id)
  if (Number.isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" })

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { publicKey: true },
    })

    if (!user || !user.publicKey) {
      return res.status(404).json({ error: "Public key not found" })
    }

    res.status(200).json({ publicKey: user.publicKey })
  } catch (error) {
    console.error(" Error fetching public key:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}


