import { describe, it, expect, vi, beforeEach } from "vitest"
import express from "express"
import request from "supertest"

// Mock keys controller before importing the router
vi.mock("../src/controllers/keys/keys.controller.js", () => {
  const createKeys = vi.fn((req, res) => res.status(201).json({ created: true }))
  const getKeys = vi.fn((req, res) => res.status(200).json({ keys: [] }))
  const updateKeys = vi.fn((req, res) => res.status(200).json({ updated: true }))
  const updateSigningKey = vi.fn((req, res) => res.status(200).json({ signingUpdated: true }))
  const getSigningPublicKey = vi.fn((req, res) => res.status(200).json({ id: req.params.id, key: "pub" }))
  const createPreKeys = vi.fn((req, res) => res.status(201).json({ prekeys: [] }))
  const getPreKeys = vi.fn((req, res) => res.status(200).json({ prekeys: [] }))
  return { createKeys, getKeys, updateKeys, updateSigningKey, getSigningPublicKey, createPreKeys, getPreKeys }
})

import router from "../src/routes/keys.routes.js"

describe("keys.routes router", () => {
  let app

  beforeEach(() => {
    vi.clearAllMocks()
    app = express()
    app.use(express.json())
    app.use("/keys", router)
  })

  it("GET /keys/ -> getKeys returns 200 and keys array", async () => {
    const res = await request(app).get("/keys/")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ keys: [] })
  })

  it("POST /keys -> createKeys returns 201", async () => {
    const res = await request(app).post("/keys/").send({ k: "v" })
    expect(res.status).toBe(201)
    expect(res.body).toEqual({ created: true })
  })

  it("POST /keys/prekeys -> createPreKeys returns 201", async () => {
    const res = await request(app).post("/keys/prekeys").send({})
    expect(res.status).toBe(201)
    expect(res.body).toEqual({ prekeys: [] })
  })

  it("GET /keys/pre-keys -> getPreKeys returns 200", async () => {
    const res = await request(app).get("/keys/pre-keys")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ prekeys: [] })
  })

  it("PUT /keys/ -> updateKeys returns 200", async () => {
    const res = await request(app).put("/keys/").send({})
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ updated: true })
  })

  it("PUT /keys/signing -> updateSigningKey returns 200", async () => {
    const res = await request(app).put("/keys/signing").send({})
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ signingUpdated: true })
  })

  it("GET /keys/:id/signing-key -> getSigningPublicKey returns the public signing key", async () => {
    const res = await request(app).get("/keys/xyz/signing-key")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ id: "xyz", key: "pub" })
  })
})
