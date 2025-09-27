// vite.config.js
import react from "@vitejs/plugin-react"
import crypto from "node:crypto"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, loadEnv } from "vite"
import path, { dirname } from "path"
import fs from "fs"
import { fileURLToPath } from "url"
import { Buffer } from "buffer"

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

function cspNoncePlugin() {
  return {
    name: "csp-nonce",

    // 1) Si hubiera <script> inline en index.html, les agrega nonce="__CSP_NONCE__"
    transformIndexHtml(html) {
      return html.replace(/<script(?![^>]*\bsrc=)[^>]*>/g, (tag) => {
        return tag.includes("nonce=")
          ? tag
          : tag.replace("<script", `<script nonce="__CSP_NONCE__"`)
      })
    },

    // 2) En cada respuesta del dev server, genera un nonce y lo inyecta en el header CSP
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
        const originalSetHeader = res.setHeader.bind(res)
        res.setHeader = (name, value) => {
          if (String(name).toLowerCase() === "content-security-policy") {
            value = String(value).replace(/__CSP_NONCE__/g, nonce)
          }
          return originalSetHeader(name, value)
        }
        res.locals = res.locals || {}
        res.locals.__CSP_NONCE__ = nonce
        next()
      })
    },

    // 3) Lo mismo para `vite preview`
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
        const originalSetHeader = res.setHeader.bind(res)
        res.setHeader = (name, value) => {
          if (String(name).toLowerCase() === "content-security-policy") {
            value = String(value).replace(/__CSP_NONCE__/g, nonce)
          }
          return originalSetHeader(name, value)
        }
        res.locals = res.locals || {}
        res.locals.__CSP_NONCE__ = nonce
        next()
      })
    },
  }
}

// ⚙️ Cabeceras objetivo del escáner
const baseSecurityHeaders = {
  "Content-Security-Policy":
    [
      "default-src 'self'",
      "script-src 'self' 'nonce-__CSP_NONCE__'",
      "style-src 'self'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss:",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests"
    ].join("; "),
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
    plugins: [react(), tailwindcss(), securityHeadersPlugin(securityHeaders), cspNoncePlugin()],
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