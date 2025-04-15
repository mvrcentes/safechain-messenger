import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { logout } from "@/utils/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import MFA from "@/pages/settings/MFA"

const Settings = () => {
  const [selected, setSelected] = useState("mfa")
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen">
      <Sidebar className="w-64 border-r">
        <SidebarContent className="flex flex-col justify-between h-full">
          <div>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <button
                        onClick={() => navigate("/")}
                        className="flex items-center gap-2 w-full text-sm"
                      >
                        Home
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Security</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <button
                        onClick={() => setSelected("mfa")}
                        className="flex items-center gap-2 w-full text-sm"
                      >
                        MFA
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>

          <div className="p-4">
            <button
              onClick={async () => {
                await logout()
                navigate("/auth")
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Logout
            </button>
          </div>
        </SidebarContent>
      </Sidebar>

      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Settings</h1>
        {selected === "mfa" && (
          <div>
            <MFA />
          </div>
        )}
      </div>
    </div>
  )
}

export default Settings
