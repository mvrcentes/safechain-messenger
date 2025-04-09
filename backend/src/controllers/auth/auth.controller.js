import argon2 from "argon2"
import { serialize } from "cookie"
import dayjs from "dayjs"
import jwt from "jsonwebtoken"
import { v4 as uuidv4 } from "uuid"

import prisma from "../../database.js"

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "15m"

export const register = async (req, res) => {
  const { name, email, password } = req.body

  console.log("Registering user:", { name, email, password })

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
    res.status(201).json({ user })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Error registering user" })
  }
}

export const logout = async (req, res) => {
  const token = req.cookies.refreshToken

  if (!token) {
    return res.status(200).json({ message: "No session to clear" })
  }

  // Remove session from DB
  try {
    await prisma.session.deleteMany({ where: { token } })
  } catch (error) {
    console.error("Error deleting session:", error)
  }

  // Force cookie removal with expiration
  res.setHeader(
    "Set-Cookie",
    "refreshToken=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax"
  )

  res.status(200).json({ message: "Logged out" })
}

export const login = async (req, res) => {
  const { email, password } = req.body
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
      },
    })

    if (!user) return res.status(404).json({ error: "User not found" })

    const valid = await argon2.verify(user.passwordHash, password)
    if (!valid) return res.status(401).json({ error: "Incorrect password" })

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
        expiresAt: dayjs().add(7, "day").toDate(),
      },
    })

    const serialized = serialize("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // en segundos
    })

    res.setHeader("Set-Cookie", serialized)

    res.json({ token: accessToken })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Login error" })
  }
}

export const refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken
  if (!token) return res.status(401).json({ error: "No refresh token" })

  const session = await prisma.session.findUnique({ where: { token } })
  if (!session || new Date() > session.expiresAt) {
    return res.status(403).json({ error: "Session expired or invalid" })
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return res.status(404).json({ error: "User not found" })

  const newAccessToken = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRATION,
    }
  )

  res.json({ token: newAccessToken })
}
