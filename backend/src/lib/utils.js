import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET

export const extractUserFromToken = (req) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null

  const token = authHeader.split(" ")[1]
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}
