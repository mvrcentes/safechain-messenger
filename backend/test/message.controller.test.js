import { test, expect, vi, beforeEach } from "vitest"

// Mock prisma and utils before importing controller
vi.mock("../src/database.js", () => ({
  default: {
    message: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock("../src/lib/utils.js", () => ({
  extractUserFromToken: vi.fn(),
}))

import prisma from "../src/database.js"
import { extractUserFromToken } from "../src/lib/utils.js"
import { getMessagesWithUser } from "../src/controllers/message/message.controller.js"

function createRes() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

test("returns 401 when no auth header", async () => {
  const req = { headers: {}, params: { userId: "2" } }
  const res = createRes()

  await getMessagesWithUser(req, res)

  expect(res.statusCode).toBe(401)
  expect(res.body).toEqual({ error: "Unauthorized" })
})

test("returns 401 when token invalid", async () => {
  const req = { headers: { authorization: "Bearer bad" }, params: { userId: "2" } }
  const res = createRes()
  extractUserFromToken.mockReturnValue(null)

  await getMessagesWithUser(req, res)

  expect(res.statusCode).toBe(401)
  expect(res.body).toEqual({ error: "Unauthorized" })
})

test("returns 400 for invalid user id param", async () => {
  const req = { headers: { authorization: "Bearer t" }, params: { userId: "not-a-number" } }
  const res = createRes()
  extractUserFromToken.mockReturnValue({ id: 5 })

  await getMessagesWithUser(req, res)

  expect(res.statusCode).toBe(400)
  expect(res.body).toEqual({ error: "Invalid user ID" })
})

test("returns 400 for invalid group id param", async () => {
  const req = { headers: { authorization: "Bearer t" }, params: { userId: "group-NaN" } }
  const res = createRes()
  extractUserFromToken.mockReturnValue({ id: 5 })

  await getMessagesWithUser(req, res)

  expect(res.statusCode).toBe(400)
  expect(res.body).toEqual({ error: "Invalid group ID" })
})

test("returns messages for user-to-user conversation", async () => {
  const req = { headers: { authorization: "Bearer t" }, params: { userId: "2" } }
  const res = createRes()
  extractUserFromToken.mockReturnValue({ id: 1 })
  const sample = [
    { id: 1, fromUserId: 1, toUserId: 2, text: "hello" },
    { id: 2, fromUserId: 2, toUserId: 1, text: "hi" },
  ]
  prisma.message.findMany.mockResolvedValue(sample)

  await getMessagesWithUser(req, res)

  expect(prisma.message.findMany).toHaveBeenCalled()
  expect(res.body).toEqual(sample)
})

test("returns messages for group conversation", async () => {
  const req = { headers: { authorization: "Bearer t" }, params: { userId: "group-10" } }
  const res = createRes()
  extractUserFromToken.mockReturnValue({ id: 1 })
  const sample = [{ id: 3, groupId: 10, text: "group msg" }]
  prisma.message.findMany.mockResolvedValue(sample)

  await getMessagesWithUser(req, res)

  expect(prisma.message.findMany).toHaveBeenCalledWith({ where: { groupId: 10 }, orderBy: { createdAt: "asc" } })
  expect(res.body).toEqual(sample)
})

test("handles DB errors and returns 500", async () => {
  const req = { headers: { authorization: "Bearer t" }, params: { userId: "2" } }
  const res = createRes()
  extractUserFromToken.mockReturnValue({ id: 1 })
  prisma.message.findMany.mockRejectedValue(new Error("boom"))

  await getMessagesWithUser(req, res)

  expect(res.statusCode).toBe(500)
  expect(res.body).toEqual({ error: "Failed to fetch messages" })
})
