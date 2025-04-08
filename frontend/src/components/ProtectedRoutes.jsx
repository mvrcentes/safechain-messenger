// src/components/ProtectedRoute.jsx
import React from "react"
import { Navigate } from "react-router-dom"
import { isAuthenticated } from "@/utils/utils"

const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/auth" />
  }

  return children
}

export default ProtectedRoute