import { jwtDecode } from "jwt-decode"
import axios from "@/lib/axios"

export const saveToken = (token) => {
  localStorage.setItem("token", token)
}

export const getToken = () => {
  return localStorage.getItem("token")
}

export const isAuthenticated = () => {
  const token = getToken()
  if (!token) return false

  try {
    const decoded = jwtDecode(token)
    const currentTime = Date.now() / 1000
    return decoded.exp > currentTime
  } catch (error) {
    return false, error
  }
}

export let isLoggingOut = false
export const setLoggingOut = (value) => {
  isLoggingOut = value
}

export const logout = async () => {
  try {
    setLoggingOut(true)
    await axios.post("/auth/logout")
  } catch (err) {
    console.error("❌ Error during logout:", err)
  } finally {
    localStorage.removeItem("token")
    setLoggingOut(false)
  }
}

export const getTokenPayload = () => {
  const token = localStorage.getItem("token")
  if (!token) return null
  try {
    return jwtDecode(token)
  } catch {
    return null
  }
}

export function downloadEncryptedKey(groupId, encryptedKey, ephemeralKey, opkUsed) {
  const blob = new Blob(
    [JSON.stringify({ groupId, encryptedKey, ephemeralKey, opkUsed }, null, 2)],
    { type: "application/json" }
  )

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `k_group_encrypted_${groupId}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
