import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { Toaster } from "@/components/ui/sonner"
import AppRouter from "@/components/AppRouter"
import Register from "@/pages/Register"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppRouter />
    <Toaster />
  </StrictMode>
)