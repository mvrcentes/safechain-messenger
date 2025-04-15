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