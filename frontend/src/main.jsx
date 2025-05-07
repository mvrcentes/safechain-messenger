import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { Toaster } from "@/components/ui/sonner"
import AppRouter from "@/components/AppRouter"
import { SidebarProvider } from "@/components/ui/sidebar"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SidebarProvider>
      <AppRouter />

      <Toaster />
    </SidebarProvider>
  </StrictMode>
)
