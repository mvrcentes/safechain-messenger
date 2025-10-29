// vite.config.js
// @ts-check
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path, { dirname } from "node:path"
import { fileURLToPath } from "node:url"

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
    host: "0.0.0.0",
    strictPort: true,
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
})