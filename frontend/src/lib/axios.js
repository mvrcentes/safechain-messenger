import axios from "axios"
import { saveToken, getToken } from "@/utils/utils"

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // 👈 para enviar la cookie
})

instance.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const res = await axios.post(
          import.meta.env.VITE_API_URL + "/auth/refresh",
          {},
          { withCredentials: true }
        )
        const newToken = res.data.token
        saveToken(newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return instance(originalRequest)
      } catch (err) {
        console.error("❌ Refresh failed:", err)
      }
    }
    return Promise.reject(error)
  }
)

export default instance
