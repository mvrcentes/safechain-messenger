import React from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sider"

import Auth from "@/app/pages/Auth"
import ProtectedRoute from "./ProtectedRoutes.jsx"

import Message from "../app/pages/Message.jsx"
import Settings from "../app/pages/Setting.jsx"

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
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SidebarProvider>
                <Settings />
              </SidebarProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
