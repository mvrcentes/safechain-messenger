import { describe, it, expect, vi, beforeEach } from "vitest"
import express from "express"
import request from "supertest"

// Mock mfa controller before importing the router
vi.mock("../src/controllers/auth/mfa.controller.js", () => {
  const setupMFA = vi.fn((req, res) => res.status(201).json({ setup: true }))
  const verifyAndEnableMFA = vi.fn((req, res) => res.status(200).json({ verified: true }))
  const getMFAStatus = vi.fn((req, res) => res.status(200).json({ enabled: false }))
  const disableMFA = vi.fn((req, res) => res.status(200).json({ disabled: true }))
  return { setupMFA, verifyAndEnableMFA, getMFAStatus, disableMFA }
})

import router from "../src/routes/mfa.routes.js"

describe("mfa.routes router", () => {
  let app

  beforeEach(() => {
    vi.clearAllMocks()
    app = express()
    app.use(express.json())
    app.use("/mfa", router)
  })

  it("POST /mfa/setup -> setupMFA returns 201", async () => {
    const res = await request(app).post("/mfa/setup").send({})
    expect(res.status).toBe(201)
    expect(res.body).toEqual({ setup: true })
  })

  it("POST /mfa/verify -> verifyAndEnableMFA returns 200", async () => {
    const res = await request(app).post("/mfa/verify").send({ code: "123456" })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ verified: true })
  })

  it("GET /mfa/status -> getMFAStatus returns enabled flag", async () => {
    const res = await request(app).get("/mfa/status")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ enabled: false })
  })

  it("DELETE /mfa/disable -> disableMFA returns disabled true", async () => {
    const res = await request(app).delete("/mfa/disable")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ disabled: true })
  })
})
