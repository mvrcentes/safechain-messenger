import React from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import Auth from "@/app/pages/Auth"
import ProtectedRoute from "./ProtectedRoutes.jsx"
import Register from "@/pages/Register"

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>
                Home
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter