// vite.config.js
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import path, { dirname } from "path"
import fs from "fs"
import crypto from "node:crypto"
import { Buffer } from "buffer"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: "0.0.0.0", // para Docker
  },
})
