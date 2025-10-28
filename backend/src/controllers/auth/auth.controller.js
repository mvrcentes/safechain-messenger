import argon2 from "argon2"
import chalk from "chalk"
import { serialize } from "cookie"
import dayjs from "dayjs"
import jwt from "jsonwebtoken"
import speakeasy from "speakeasy"
import { v4 as uuidv4 } from "uuid"

import prisma from "../../database.js"
import { recordFailedLoginAttempt, resetFailedLoginAttempts } from "../../middleware/loginAttempts.js"

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "15m"

export const register = async (req, res) => {
  const { name, email, password } = req.body

  console.log(chalk.blue("📥 Registering user:"), { name, email })

  try {
    const hashedPassword = await argon2.hash(password)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })
    console.log(chalk.green("✅ User registered:"), user.email)
    res.status(201).json({ user })
  } catch (err) {
    console.error(chalk.red("❌ Error registering user:"), err)
    res.status(500).json({ error: "Error registering user" })
  }
}

export const logout = async (req, res) => {
  console.log(chalk.blue("📤 Logout requested"))
  const token = req.cookies.refreshToken

  if (!token) {
    console.log(chalk.yellow("⚠️ No refresh token found in cookies"))
    return res.status(200).json({ message: "No session to clear" })
  }

  // Remove session from DB
  try {
    await prisma.session.deleteMany({ where: { token } })
    console.log(chalk.green("✅ Session removed from database"))
  } catch (error) {
    console.error("Error deleting session:", error)
  }

  // Force cookie removal with expiration
  res.setHeader(
    "Set-Cookie",
    "refreshToken=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax"
  )
  console.log(chalk.magenta("🍪 Refresh token cookie cleared"))

  res.status(200).json({ message: "Logged out" })
  console.log(chalk.green("👋 User logged out successfully"))
}

export const login = async (req, res) => {
  const { email, password } = req.body

  try {
    // Validate password length (server-side) - requirement: minimum 8 characters
    if (!password || typeof password !== 'string' || password.length < 8) {
      console.log(chalk.yellow('⚠️ Login attempt with short or invalid password'))
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        mfaSecret: true,
      },
    })

    if (!user) {
      // Do not reveal whether the email exists
      console.log(chalk.red('❌ Login failed - Invalid credentials (user not found)'))
      await recordFailedLoginAttempt(email)
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const valid = await argon2.verify(user.passwordHash, password)
    if (!valid) {
      // Do not reveal whether the password was wrong
      console.log(chalk.red('❌ Login failed - Invalid credentials (bad password)'))
      await recordFailedLoginAttempt(email)
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    if (user.mfaSecret) {
      console.log(chalk.yellow('🔐 MFA required for user:'), user.email)
      return res.status(206).json({
        message: 'MFA required',
        mfaRequired: true,
      })
    }

    const accessToken = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRATION,
      }
    )

    const refreshToken = uuidv4()

    // Guarda la sesión en DB
    await prisma.session.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: dayjs().add(7, 'day').toDate(),
      },
    })

    const serialized = serialize('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // en segundos
    })

    res.setHeader('Set-Cookie', serialized)

    console.log(chalk.green('✅ Login successful for:'), user.email)
    await resetFailedLoginAttempts(email)
    res.json({ token: accessToken })
  } catch (err) {
    console.error(chalk.red('❌ Login error:'), err)
    res.status(500).json({ error: 'Login error' })
  }
}

export const loginWithMFA = async (req, res) => {
  const { email, token } = req.body
  console.log(chalk.blue("🔐 MFA login attempt for:"), email)

  if (!email || !token) {
    console.log(chalk.red("❌ MFA login failed - Missing email or token"))
    return res.status(400).json({ error: "Email and token required" })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        mfaSecret: true,
      },
    })

    if (!user?.mfaSecret) {
      console.log(
        chalk.red("❌ MFA login failed - MFA not active or user not found")
      )
      return res.status(403).json({ error: "MFA not active" })
    }

    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: "base32",
      token,
      window: 1,
    })

    if (!isValid) {
      console.log(chalk.red("❌ MFA login failed - Invalid MFA code"))
      return res.status(401).json({ error: "Invalid MFA code" })
    }

    // MFA verificado: generar tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    )

    const refreshToken = uuidv4()

    await prisma.session.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: dayjs().add(7, "day").toDate(),
      },
    })

    const serialized = serialize("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    })

    res.setHeader("Set-Cookie", serialized)

    console.log(chalk.green("✅ MFA login successful for:"), user.email)
    res.json({ token: accessToken })
  } catch (err) {
    console.error(chalk.red("❌ MFA login error:"), err)
    res.status(500).json({ error: "Error in MFA login" })
  }
}

export const refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken
  console.log(chalk.blue("📥 Refresh token request received"))
  console.log(chalk.gray("🔑 Provided token:"), token)
  if (!token) {
    console.log(chalk.red("❌ Refresh failed - No refresh token provided"))
    return res.status(401).json({ error: "No refresh token" })
  }

  const session = await prisma.session.findUnique({ where: { token } })
  if (!session || new Date() > session.expiresAt) {
    console.log(chalk.red("❌ Refresh failed - Session expired or invalid"))
    return res.status(403).json({ error: "Session expired or invalid" })
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) {
    console.warn(
      chalk.yellow("⚠️ Refresh valid session, but user not found:"),
      session.userId
    )
    return res.status(403).json({ error: "Session valid, but user not found" })
  }
  console.log(
    chalk.green("✅ Refresh successful - New token issued for:"),
    user.email
  )

  const newAccessToken = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRATION,
    }
  )

  res.json({ token: newAccessToken })
}
