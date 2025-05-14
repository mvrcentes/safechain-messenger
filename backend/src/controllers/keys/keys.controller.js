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
      select: { publicKey: true, signingPublicKey: true },
    })

    if (!userData?.publicKey && !userData?.signingPublicKey) {
      return res.status(404).json({ error: "Keys not found" })
    }

    res.json({ publicKey: userData.publicKey, signingPublicKey: userData.signingPublicKey })
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

  const { publicKey, signingPublicKey } = req.body

  if (!publicKey && !signingPublicKey) {
    return res.status(400).json({ error: "Missing public or signing public key" })
  }

  try {
    const userUpdated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(publicKey && { publicKey }),
        ...(signingPublicKey && { signingPublicKey }),
      },
    })

    res.json({
      publicKey: userUpdated.publicKey,
      signingPublicKey: userUpdated.signingPublicKey
    })
  } catch (error) {
    console.error("Error updating keys:", error)
    res.status(500).json({ error: "Failed to update keys" })
  }
}

export async function updateSigningKey(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const user = extractUserFromToken(req)
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { signingPublicKey } = req.body

  if (!signingPublicKey) {
    return res.status(400).json({ error: "Missing signing public key" })
  }

  try {
    const userUpdated = await prisma.user.update({
      where: { id: user.id },
      data: { signingPublicKey },
    })

    res.json({ signingPublicKey: userUpdated.signingPublicKey })
  } catch (error) {
    console.error("Error updating signing key:", error)
    res.status(500).json({ error: "Failed to update signing key" })
  }
}