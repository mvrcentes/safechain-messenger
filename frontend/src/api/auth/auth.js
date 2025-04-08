import axios from "axios"

import { hashPassword } from "@/lib/crypto"

const API_URL =
  import.meta.env.VITE_API_URL + "/auth" || "http://localhost:5000/api/auth"

export const register = async (name, email, password) => {
  try {
    const hashedPassword = await hashPassword(password)

    const response = await axios.post(`${API_URL}/register`, {
      name,
      email,
      password: hashedPassword,
    })
    return response.data
  } catch (error) {
    console.error("Error during registration:", error)
    throw error
  }
}

export const loginUser = async (email, password) => {
  try {
    const hashedPassword = await hashPassword(password)

    const response = await axios.post(`${API_URL}/login`, {
      email,
      password: hashedPassword,
    })
    return response.data
  } catch (error) {
    console.error("Error during login:", error)
    throw error
  }
}
