import { describe, it, expect, vi, beforeEach } from "vitest"
import express from "express"
import request from "supertest"

// Mock group controller before importing the router
vi.mock("../src/controllers/user/group.controller.js", () => {
  const createGroup = vi.fn((req, res) => res.status(201).json({ created: true }))
  const getUserGroups = vi.fn((req, res) => res.status(200).json({ groups: [] }))
  const sendGroupMessage = vi.fn((req, res) => res.status(200).json({ sent: true, groupId: req.params.groupId }))
  const getEncryptedGroupKey = vi.fn((req, res) => res.status(200).json({ key: "encrypted" }))
  return { createGroup, getUserGroups, sendGroupMessage, getEncryptedGroupKey }
})

import router from "../src/routes/group.routes.js"

describe("group.routes router", () => {
  let app

  beforeEach(() => {
    vi.clearAllMocks()
    app = express()
    app.use(express.json())
    app.use(router)
  })

  it("POST /groups -> createGroup returns 201", async () => {
    const res = await request(app).post("/groups").send({ name: "g" })
    expect(res.status).toBe(201)
    expect(res.body).toEqual({ created: true })
  })

  it("GET /groups -> getUserGroups returns 200 and groups array", async () => {
    const res = await request(app).get("/groups")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ groups: [] })
  })

  it("POST /messages/group/:groupId -> sendGroupMessage returns 200 with groupId", async () => {
    const res = await request(app).post("/messages/group/abc123").send({ msg: "hi" })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ sent: true, groupId: "abc123" })
  })

  it("GET /groups/:groupId/k_group -> getEncryptedGroupKey returns key", async () => {
    const res = await request(app).get("/groups/zzz/k_group")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ key: "encrypted" })
  })
})
