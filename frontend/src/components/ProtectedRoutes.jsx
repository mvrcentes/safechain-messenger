import React, { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { isAuthenticated, saveToken } from "@/utils/utils"
import axios from "@/lib/axios"

const ProtectedRoute = ({ children }) => {
  const [checking, setChecking] = useState(true)
  const [auth, setAuth] = useState(false)

  useEffect(() => {
    const verify = async () => {
      if (isAuthenticated()) {
        setAuth(true)
        setChecking(false)
      } else {
        try {
          const res = await axios.post("/auth/refresh", {}, { withCredentials: true })
          const newToken = res.data.token
          saveToken(newToken)
          setAuth(true)
        } catch (err) {
          console.error("❌ Refresh failed:", err)
          setAuth(false)
        } finally {
          setChecking(false)
        }
      }
    }

    verify()
  }, [])

  if (checking) return null
  return auth ? children : <Navigate to="/auth" />
}

export default ProtectedRoute