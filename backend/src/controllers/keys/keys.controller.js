import prisma from "../../database.js"
import { extractUserFromToken } from "../../lib/utils.js"

export async function getKeys(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const user = extractUserFromToken(req)
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  try {
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { publicKey: true },
    })

    if (!userData?.publicKey) {
      return res.status(404).json({ error: "Keys not found" })
    }

    res.json({ publicKey: userData.publicKey })
  } catch (error) {
    console.error("Error fetching keys:", error)
    res.status(500).json({ error: "Failed to fetch keys" })
  }
}

export async function createKeys(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const user = extractUserFromToken(req)
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { publicKey } = req.body

  if (!publicKey) {
    return res.status(400).json({ error: "Missing public key" })
  }

  try {
    const userUpdated = await prisma.user.update({
      where: { id: user.id },
      data: { publicKey },
    })

    res.status(201).json({ publicKey: userUpdated.publicKey })
  } catch (error) {
    console.error("Error creating keys:", error)
    res.status(500).json({ error: "Failed to create keys" })
  }
}

export async function updateKeys(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const user = extractUserFromToken(req)
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { publicKey } = req.body

  if (!publicKey) {
    return res.status(400).json({ error: "Missing public key" })
  }

  try {
    const userUpdated = await prisma.user.update({
      where: { id: user.id },
      data: { publicKey },
    })

    res.json({ publicKey: userUpdated.publicKey })
  } catch (error) {
    console.error("Error updating keys:", error)
    res.status(500).json({ error: "Failed to update keys" })
  }
}