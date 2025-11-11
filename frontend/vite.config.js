// vite.config.js
// @ts-check
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path, { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import process from "node:process"
import { loadEnv } from "vite"

// (envVars se cargará dentro de defineConfig usando el parámetro "mode")

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig(({ mode }) => {
  const envVars = loadEnv(mode, process.cwd(), "")
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      host: "0.0.0.0",
      strictPort: true,
      port: envVars.VITE_DEV_SERVER_PORT ? Number(envVars.VITE_DEV_SERVER_PORT) : 5173,
    },
    test: {
      globals: true,
      environment: "jsdom", // para apps React SPA
      // reduce fugas de cobertura a libs externas / build
      coverage: {
        reporter: ["text", "html", "lcov"],
        reportsDirectory: "./coverage",
        exclude: [
          "node_modules/",
          "dist/",
          "**/*.d.ts",
          "**/__tests__/**",
          "**/*.config.*",
        ],
      },
      // tiempos razonables para evitar DoS por tests colgados
      testTimeout: 10000,
      hookTimeout: 10000,
      // aislar mejor entre pruebas
      isolate: true,
    },
    build: {
      target: "es2022",
    },
  }
})