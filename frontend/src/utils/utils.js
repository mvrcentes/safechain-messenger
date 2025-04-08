import { jwtDecode } from "jwt-decode"

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

export const logout = () => {
  localStorage.removeItem("token")
}
