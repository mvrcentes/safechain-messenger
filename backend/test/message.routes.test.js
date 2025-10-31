import { describe, it, expect, vi, beforeEach } from "vitest"
import express from "express"
import request from "supertest"

// Mock message controller before importing the router
vi.mock("../src/controllers/message/message.controller.js", () => {
  const getMessagesWithUser = vi.fn((req, res) =>
    res.status(200).json({ with: req.params.userId, messages: [] })
  )
  return { getMessagesWithUser }
})

import router from "../src/routes/message.routes.js"

describe("message.routes router", () => {
  let app

  beforeEach(() => {
    vi.clearAllMocks()
    app = express()
    app.use(express.json())
    app.use("/messages", router)
  })

  it("GET /messages/:userId -> returns messages for user", async () => {
    const res = await request(app).get("/messages/user42")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ with: "user42", messages: [] })
  })
})
