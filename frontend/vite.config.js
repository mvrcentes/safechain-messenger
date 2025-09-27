// vite.config.js
import react from "@vitejs/plugin-react"
import crypto from "node:crypto"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, loadEnv } from "vite"
import path, { dirname } from "path"
import fs from "fs"
import crypto from "node:crypto"
import { Buffer } from "buffer"
import { fileURLToPath } from "url"
import { Buffer } from "buffer"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ───────────────────────────────────────────────────────────────────────────────
// 1) Cabeceras de seguridad (dinámicas por entorno)
// ───────────────────────────────────────────────────────────────────────────────
function buildSecurityHeaders({ isDev, useHttps }) {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'nonce-__CSP_NONCE__'",
    // En dev Vite inyecta <style> inline (HMR) → permitimos inline SOLO en dev
    isDev ? "style-src 'self' 'unsafe-inline'" : "style-src 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' ws: wss:",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ")

  const headers = {
    "Content-Security-Policy": csp,
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=(), autoplay=(self)",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Resource-Policy": "same-site",
  }
  if (useHttps) {
    headers["Strict-Transport-Security"] =
      "max-age=31536000; includeSubDomains; preload"
  }
  return headers
}

// ───────────────────────────────────────────────────────────────────────────────
// 2) Plugin que añade SIEMPRE los headers (cubre /@vite/*, HMR, assets…)
// ───────────────────────────────────────────────────────────────────────────────
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

// ───────────────────────────────────────────────────────────────────────────────
// 3) Plugin de nonce CSP: genera un nonce por respuesta y lo inserta en header
//    y en cualquier <script> inline de index.html (si hubiera).
// ───────────────────────────────────────────────────────────────────────────────
function cspNoncePlugin() {
  return {
    name: "csp-nonce",
    transformIndexHtml(html) {
      return html.replace(/<script(?![^>]*\bsrc=)[^>]*>/g, (tag) =>
        tag.includes("nonce=")
          ? tag
          : tag.replace("<script", `<script nonce="__CSP_NONCE__"`)
      )
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
        const original = res.setHeader.bind(res)
        res.setHeader = (name, value) => {
          if (String(name).toLowerCase() === "content-security-policy") {
            value = String(value).replace(/__CSP_NONCE__/g, nonce)
          }
          return original(name, value)
        }
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
        const original = res.setHeader.bind(res)
        res.setHeader = (name, value) => {
          if (String(name).toLowerCase() === "content-security-policy") {
            value = String(value).replace(/__CSP_NONCE__/g, nonce)
          }
          return original(name, value)
        }
        next()
      })
    },
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// 4) Config principal
// ───────────────────────────────────────────────────────────────────────────────
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "")
  const DEV_PORT = Number(env.FRONTEND_LOCAL_PORT || 5173)

  const useHttps = env.HTTPS_DEV === "1"
  const httpsConfig = useHttps
    ? {
      key: fs.readFileSync(env.SSL_KEY_PATH || "certs/localhost-key.pem"),
      cert: fs.readFileSync(env.SSL_CERT_PATH || "certs/localhost-cert.pem"),
    }
    : false

  const isDev = mode === "development"
  const securityHeaders = buildSecurityHeaders({ isDev, useHttps })

  return {
    plugins: [
      react(),
      tailwindcss(),
      securityHeadersPlugin(securityHeaders),
      cspNoncePlugin(),
    ],
    resolve: { alias: { "@": path.resolve(__dirname, "src") } },

    server: {
      host: "0.0.0.0",
      port: DEV_PORT,
      https: httpsConfig,
      // Si quieres evitar CORS en dev, activa el proxy al backend:
      // proxy: { "/api": { target: "http://localhost:4000", changeOrigin: true } },
    },

    preview: {
      port: 5173,
      https: httpsConfig,
    },

    build: {
      sourcemap: false, // evita disclosure en pruebas
    },
  }
})