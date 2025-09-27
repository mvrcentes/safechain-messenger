// vite.config.js
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, loadEnv } from "vite"
import path, { dirname } from "path"
import fs from "fs"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 🔌 Middleware para añadir SIEMPRE las cabeceras (cubre HMR, /@vite/*, assets, etc.)
function securityHeadersPlugin(headers) {
  return {
    name: "security-headers",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
        next()
      })
    },
  }
}

// ⚙️ Cabeceras objetivo del escáner
const baseSecurityHeaders = {
  // CSP apta para dev con HMR (ws/wss)
  "Content-Security-Policy":
    "default-src 'self'; connect-src 'self' ws: wss:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(), autoplay=(self)",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Resource-Policy": "same-site",
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "")
  const DEV_PORT = Number(env.FRONTEND_LOCAL_PORT || 5173)

  const useHttps = env.HTTPS_DEV === "1" // pon HTTPS_DEV=1 en tu .env si quieres HTTPS local
  const httpsConfig = useHttps
    ? {
      key: fs.readFileSync(env.SSL_KEY_PATH || "certs/localhost-key.pem"),
      cert: fs.readFileSync(env.SSL_CERT_PATH || "certs/localhost-cert.pem"),
    }
    : false

  // Añade HSTS SOLO si servimos por HTTPS (ZAP lo exige en HTTPS)
  const securityHeaders = {
    ...baseSecurityHeaders,
    ...(useHttps
      ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload" }
      : {}),
  }

  return {
    plugins: [react(), tailwindcss(), securityHeadersPlugin(securityHeaders)],
    resolve: { alias: { "@": path.resolve(__dirname, "src") } },

    server: {
      host: "0.0.0.0",
      port: DEV_PORT,
      https: httpsConfig,
      // `headers` ya no es necesario, el plugin los inyecta globalmente
      // Si haces proxy al backend, puedes evitar CORS en dev:
      // proxy: { "/api": { target: "http://localhost:5000", changeOrigin: true } },
    },

    preview: {
      port: 5173,
      https: httpsConfig,
    },

    build: {
      sourcemap: false, // evita disclosure por source maps en pruebas
    },
  }
})