import React from "react"
import SearchBar from "./SearchBar"
import { jwtDecode } from "jwt-decode"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { logout } from "@/utils/utils"

const Layout = ({ children }) => {
  const token = localStorage.getItem("token")
  let userInitial = "?"
  let userInfo = { name: "", email: "unknown@example.com" }

  if (token) {
    try {
      const decoded = jwtDecode(token)
      userInfo = decoded
      userInitial =
        decoded.name?.charAt(0).toUpperCase() ||
        decoded.email?.charAt(0).toUpperCase() ||
        "?"
    } catch (err) {
      console.error("Error decoding token:", err)
    }
  }

  return (
    <div className="flex flex-col w-screen h-screen bg-background text-foreground">
      <div className="flex flex-row items-center justify-between w-screen bg-background text-foreground p-6 gap-6">
        <h1 className="text-3xl font-semibold">Messages</h1>

        <SearchBar />

        <Popover>
          <PopoverTrigger asChild>
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground font-bold cursor-pointer">
              {userInitial}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-56 text-sm">
            <div className="mb-2">
              <p className="font-medium text-foreground">
                {userInfo.name || userInfo.email}
              </p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => (window.location.href = "/settings")}
            >
              Settings
            </Button>
            <Button
              variant="ghost"
              className="text-destructive w-full justify-start"
              onClick={async () => {
                await logout()
                window.location.href = "/auth"
              }}>
              Log out
            </Button>
          </PopoverContent>
        </Popover>
      </div>
      {children}
    </div>
  )
}

export default Layout
