import { test, expect, vi, beforeEach } from "vitest"
import request from "supertest"
import express from "express"

// Mock de Prisma para que el health check no requiera DATABASE_URL real
vi.mock("../src/database.js", () => {
    return {
        default: {
            $queryRaw: vi.fn().mockResolvedValue([{ ok: 1 }]),
        },
    }
})

// Importa el router de health después del mock
import healthRouter from "../src/health/health.routes.js"

// Crea una app mínima para montar SOLO la ruta de health
function createTestApp() {
    const app = express()
    app.use("/health", healthRouter)
    return app
}

let app
beforeEach(() => {
    app = createTestApp()
})

test("GET /health responde 200 y database: connected", async () => {
    const res = await request(app).get("/health")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: "ok", database: "connected" })
})