import React from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import Auth from "@/app/pages/Auth"
import ProtectedRoute from "./ProtectedRoutes.jsx"

import Message from "../app/pages/Message.jsx"

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Message />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter