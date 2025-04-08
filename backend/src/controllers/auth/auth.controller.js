import argon2 from "argon2"
import jwt from "jsonwebtoken"
import prisma from "../../database.js"

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "1h"

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

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRATION,
    })

    res.json({ token })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Login error" })
  }
}
