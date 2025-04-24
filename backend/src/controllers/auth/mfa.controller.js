import chalk from "chalk"
import qrcode from "qrcode"
import speakeasy from "speakeasy"

import jwt from "jsonwebtoken"
import prisma from "../../database.js"

const JWT_SECRET = process.env.JWT_SECRET

const extractUserFromToken = (req) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null

  const token = authHeader.split(" ")[1]
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

export const getMFAStatus = async (req, res) => {
  const user = extractUserFromToken(req)
  if (!user) {
    console.log(chalk.red("🔴 Unauthorized - Missing or invalid token"))
    return res.status(401).json({ error: "Invalid or missing token" })
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { mfaSecret: true },
    })

    const isEnabled = !!dbUser?.mfaSecret
    console.log(chalk.green(`✅ GET /mfa/status → MFA enabled: ${isEnabled}`))

    res.json({ mfaEnabled: isEnabled })
  } catch (err) {
    console.error(chalk.red("❌ Error fetching MFA status:"), err)
    res.status(500).json({ error: "Failed to get MFA status" })
  }
}

export const setupMFA = async (req, res) => {
  const user = extractUserFromToken(req)
  if (!user) return res.status(401).json({ error: "Invalid or missing token" })

  const email = user.email

  try {
    const secret = speakeasy.generateSecret({
      name: `SafeChain (${email})`,
    })

    const qrCode = await qrcode.toDataURL(secret.otpauth_url)

    res.json({
      secret: secret.base32,
      qrCode,
    })
  } catch (err) {
    console.error("MFA setup error:", err)
    res.status(500).json({ error: "Failed to generate MFA QR" })
  }
}

export const verifyAndEnableMFA = async (req, res) => {
  const user = extractUserFromToken(req)
  if (!user) return res.status(401).json({ error: "Invalid or missing token" })

  const { token, secret } = req.body
  const email = user.email

  if (!token || !secret) {
    return res.status(400).json({ error: "Missing fields" })
  }

  const isValid = speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1,
  })

  if (!isValid) {
    return res.status(401).json({ error: "Invalid MFA code" })
  }

  try {
    await prisma.user.update({
      where: { email },
      data: {
        mfaSecret: secret,
      },
    })

    res.json({ message: "MFA enabled successfully" })
  } catch (err) {
    console.error("Error enabling MFA:", err)
    res.status(500).json({ error: "Failed to enable MFA" })
  }
}

export const disableMFA = async (req, res) => {
  const user = extractUserFromToken(req)
  if (!user) {
    console.log(chalk.red("🔴 Unauthorized - Cannot disable MFA"))
    return res.status(401).json({ error: "Invalid or missing token" })
  }

  try {
    await prisma.user.update({
      where: { email: user.email },
      data: {
        mfaSecret: null,
      },
    })

    console.log(chalk.yellow("⚠️ MFA disabled for user:"), user.email)
    res.json({ message: "MFA disabled successfully" })
  } catch (err) {
    console.error(chalk.red("❌ Error disabling MFA:"), err)
    res.status(500).json({ error: "Failed to disable MFA" })
  }
}
