import { describe, it, expect, vi, beforeEach } from "vitest"
import express from "express"
import request from "supertest"

// Mock user controller before importing the router
vi.mock("../src/controllers/user/user.controller.js", () => {
  const getAllUsers = vi.fn((req, res) => res.status(200).json({ users: [] }))
  const getPublicEncryptKey = vi.fn((req, res) => res.status(200).json({ id: req.params.id, key: "pubkey" }))
  return { getAllUsers, getPublicEncryptKey }
})

import router from "../src/routes/user.routes.js"

describe("user.routes router", () => {
  let app

  beforeEach(() => {
    vi.clearAllMocks()
    app = express()
    app.use(express.json())
    app.use("/user", router)
  })

  it("GET /user/all -> getAllUsers returns list", async () => {
    const res = await request(app).get("/user/all")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ users: [] })
  })

  it("GET /user/:id/public-key -> returns public key for id", async () => {
    const res = await request(app).get("/user/abc123/public-key")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ id: "abc123", key: "pubkey" })
  })
})
