import { describe, it, expect, vi, beforeEach } from "vitest"
import express from "express"
import request from "supertest"

// Mock controllers and middlewares before importing the router
vi.mock("../src/controllers/auth/auth.controller.js", () => {
  const login = vi.fn((req, res) => res.status(200).json({ called: req._calls || [] }))
  const loginWithMFA = vi.fn((req, res) => res.status(200).send("mfa"))
  const logout = vi.fn((req, res) => res.status(200).send("logout"))
  const refreshToken = vi.fn((req, res) => res.status(200).send("refresh"))
  const register = vi.fn((req, res) => res.status(201).send("registered"))
  return { login, loginWithMFA, logout, refreshToken, register }
})

vi.mock("../src/middleware/ipRateLimiter.js", () => {
  return {
    loginIpRateLimiter: (req, _res, next) => {
      req._calls = req._calls || []
      req._calls.push("ip")
      next()
    },
  }
})

vi.mock("../src/middleware/loginAttempts.js", () => {
  return {
    accountLockMiddleware: (req, _res, next) => {
      req._calls = req._calls || []
      req._calls.push("lock")
      next()
    },
  }
})

// Import the router after mocks are registered so the module uses the mocked dependencies
import router from "../src/routes/auth.routes.js"

describe("auth.routes router", () => {
  let app

  beforeEach(() => {
    vi.clearAllMocks()
    app = express()
    app.use(express.json())
    app.use(router)
  })

  it("POST /register -> calls register controller and returns 201", async () => {
    const res = await request(app).post("/register").send({ username: "u" })
    expect(res.status).toBe(201)
    expect(res.text).toBe("registered")
  })

  it("POST /auth/login -> runs ipRateLimiter then accountLockMiddleware then login handler", async () => {
    const res = await request(app).post("/auth/login").send({})
    expect(res.status).toBe(200)
    // middleware should have added markers in order
    expect(res.body.called).toEqual(["ip", "lock"])
  })

  it("POST /login -> alternate login path uses same middlewares and handler order", async () => {
    const res = await request(app).post("/login").send({})
    expect(res.status).toBe(200)
    expect(res.body.called).toEqual(["ip", "lock"])
  })

  it("POST /login/mfa -> calls loginWithMFA controller", async () => {
    const res = await request(app).post("/login/mfa").send({})
    expect(res.status).toBe(200)
    expect(res.text).toBe("mfa")
  })

  it("GET /refresh -> calls refreshToken controller", async () => {
    const res = await request(app).get("/refresh")
    expect(res.status).toBe(200)
    expect(res.text).toBe("refresh")
  })

  it("POST /logout -> calls logout controller", async () => {
    const res = await request(app).post("/logout").send({})
    expect(res.status).toBe(200)
    expect(res.text).toBe("logout")
  })
})
