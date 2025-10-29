import { test, expect, vi, beforeEach } from "vitest"

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

function makeRes() {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

test("getAllUsers returns 401 when unauthorized", async () => {
  vi.doMock("../src/lib/utils.js", () => ({ extractUserFromToken: () => null }))
  const { getAllUsers } = await import("../src/controllers/user/user.controller.js")

  const req = {}
  const res = makeRes()

  await getAllUsers(req, res)

  expect(res.status).toHaveBeenCalledWith(401)
  expect(res.json).toHaveBeenCalledWith({ error: "Invalid or missing token" })
})

test("getAllUsers returns list of users excluding current user", async () => {
  const user = { email: "me@example.com" }
  const users = [
    { id: 2, name: "Alice", email: "alice@example.com" },
    { id: 3, name: "Bob", email: "bob@example.com" },
  ]

  const findMany = vi.fn().mockResolvedValue(users)
  vi.doMock("../src/lib/utils.js", () => ({ extractUserFromToken: () => user }))
  vi.doMock("../src/database.js", () => ({ default: { user: { findMany } } }))

  const { getAllUsers } = await import("../src/controllers/user/user.controller.js")
  const req = {}
  const res = makeRes()

  await getAllUsers(req, res)

  expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { email: { not: user.email } } }))
  expect(res.status).toHaveBeenCalledWith(200)
  expect(res.json).toHaveBeenCalledWith(users)
})

test("getAllUsers handles DB error and returns 500", async () => {
  const user = { email: "me@example.com" }
  const findMany = vi.fn().mockRejectedValue(new Error("boom"))
  vi.doMock("../src/lib/utils.js", () => ({ extractUserFromToken: () => user }))
  vi.doMock("../src/database.js", () => ({ default: { user: { findMany } } }))

  const { getAllUsers } = await import("../src/controllers/user/user.controller.js")
  const req = {}
  const res = makeRes()

  await getAllUsers(req, res)

  expect(res.status).toHaveBeenCalledWith(500)
  expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
})

test("getPublicEncryptKey returns 400 for invalid id", async () => {
  const { getPublicEncryptKey } = await import("../src/controllers/user/user.controller.js")
  const req = { params: { id: "not-a-number" } }
  const res = makeRes()

  await getPublicEncryptKey(req, res)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({ error: "Invalid user ID" })
})

test("getPublicEncryptKey returns 404 when public key not found", async () => {
  const findUnique = vi.fn().mockResolvedValue(null)
  vi.doMock("../src/database.js", () => ({ default: { user: { findUnique } } }))

  const { getPublicEncryptKey } = await import("../src/controllers/user/user.controller.js")
  const req = { params: { id: "5" } }
  const res = makeRes()

  await getPublicEncryptKey(req, res)

  expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 5 }, select: { publicKey: true } }))
  expect(res.status).toHaveBeenCalledWith(404)
  expect(res.json).toHaveBeenCalledWith({ error: "Public key not found" })
})

test("getPublicEncryptKey returns public key on success", async () => {
  const findUnique = vi.fn().mockResolvedValue({ publicKey: "pk-data" })
  vi.doMock("../src/database.js", () => ({ default: { user: { findUnique } } }))

  const { getPublicEncryptKey } = await import("../src/controllers/user/user.controller.js")
  const req = { params: { id: "7" } }
  const res = makeRes()

  await getPublicEncryptKey(req, res)

  expect(res.status).toHaveBeenCalledWith(200)
  expect(res.json).toHaveBeenCalledWith({ publicKey: "pk-data" })
})

test("getPublicEncryptKey handles DB errors and returns 500", async () => {
  const findUnique = vi.fn().mockRejectedValue(new Error("boom"))
  vi.doMock("../src/database.js", () => ({ default: { user: { findUnique } } }))

  const { getPublicEncryptKey } = await import("../src/controllers/user/user.controller.js")
  const req = { params: { id: "7" } }
  const res = makeRes()

  await getPublicEncryptKey(req, res)

  expect(res.status).toHaveBeenCalledWith(500)
  expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
})
