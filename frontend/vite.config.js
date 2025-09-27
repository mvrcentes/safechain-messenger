// vite.config.js
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import path, { dirname } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DEV_PORT = Number(import.meta.env.FRONTEND_LOCAL_PORT || 5173)

// 🔒 Cabeceras de seguridad que Vite enviará en dev (y preview)
const securityHeaders = {
  // CSP mínima segura para dev con HMR (ws/wss)
  "Content-Security-Policy":
    "default-src 'self'; connect-src 'self' ws: wss:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
  // Anti-clickjacking
  "X-Frame-Options": "DENY",
  // No sniff
  "X-Content-Type-Options": "nosniff",
  // Referer estricto
  "Referrer-Policy": "no-referrer",
  // Permissions-Policy (sustituye a Feature-Policy)
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(), autoplay=(self)",
  // Aislamiento de contexto (opcionales según tu app)
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Resource-Policy": "same-site",
  // ⚠️ HSTS solo tiene efecto en HTTPS real; si activas https en dev, descomenta:
  // "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
}

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },

  server: {
    host: "0.0.0.0",
    port: DEV_PORT,
    // strictPort: true, // opcional si no quieres que cambie de puerto
    https: false, // pon true solo si tienes cert/key locales
    headers: securityHeaders,

    // proxy: {
    //   "/api": {
    //     target: "http://localhost:5000",
    //     changeOrigin: true,
    //   },
    // },
  },

  // Cuando uses `vite preview` para revisar el build, aplica las mismas cabeceras
  preview: {
    port: 5173,
    headers: securityHeaders,
  },

  build: {
    sourcemap: false, // evita fuga de info en prod/previews
  },
})