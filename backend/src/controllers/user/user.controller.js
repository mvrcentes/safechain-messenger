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
