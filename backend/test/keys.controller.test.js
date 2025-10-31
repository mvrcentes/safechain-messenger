import { test, expect, vi, beforeEach } from "vitest"

// Mocks
vi.mock("../src/database.js", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    preKey: {
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

vi.mock("../src/lib/utils.js", () => ({
  extractUserFromToken: vi.fn(),
}))

import prisma from "../src/database.js"
import { extractUserFromToken } from "../src/lib/utils.js"
import {
  getSigningPublicKey,
  getKeys,
  createKeys,
  updateKeys,
  updateSigningKey,
  createPreKeys,
  getPreKeys,
} from "../src/controllers/keys/keys.controller.js"

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

beforeEach(() => vi.clearAllMocks())

// getSigningPublicKey
test("getSigningPublicKey returns 404 when key not found", async () => {
  const req = { params: { id: "10" } }
  const res = createRes()
  prisma.user.findUnique.mockResolvedValue(null)

  await getSigningPublicKey(req, res)

  expect(res.statusCode).toBe(404)
  expect(res.body).toEqual({ error: "Signing key not found" })
})

test("getSigningPublicKey returns key on success", async () => {
  const req = { params: { id: "10" } }
  const res = createRes()
  prisma.user.findUnique.mockResolvedValue({ signingPublicKey: "ABC" })

  await getSigningPublicKey(req, res)

  expect(res.body).toEqual({ signingPublicKey: "ABC" })
})

test("getSigningPublicKey handles DB error -> 500", async () => {
  const req = { params: { id: "10" } }
  const res = createRes()
  prisma.user.findUnique.mockRejectedValue(new Error("boom"))

  await getSigningPublicKey(req, res)

  expect(res.statusCode).toBe(500)
})

// getKeys
test("getKeys returns 401 without auth header", async () => {
  const req = { headers: {} }
  const res = createRes()

  await getKeys(req, res)

  expect(res.statusCode).toBe(401)
})

test("getKeys returns 401 when token invalid", async () => {
  const req = { headers: { authorization: "Bearer t" } }
  const res = createRes()
  extractUserFromToken.mockReturnValue(null)

  await getKeys(req, res)

  expect(res.statusCode).toBe(401)
})

test("getKeys returns 404 when no keys present", async () => {
  const req = { headers: { authorization: "Bearer t" } }
  const res = createRes()
  extractUserFromToken.mockReturnValue({ id: 1 })
  prisma.user.findUnique.mockResolvedValue({ publicKey: null, signingPublicKey: null })

  await getKeys(req, res)

  expect(res.statusCode).toBe(404)
})

test("getKeys returns keys on success", async () => {
  const req = { headers: { authorization: "Bearer t" } }
  const res = createRes()
  extractUserFromToken.mockReturnValue({ id: 1 })
  prisma.user.findUnique.mockResolvedValue({ publicKey: "P", signingPublicKey: "S" })

  await getKeys(req, res)

  expect(res.body).toEqual({ publicKey: "P", signingPublicKey: "S" })
})

// createKeys
test("createKeys returns 401 without auth", async () => {
  const req = { headers: {}, body: {} }
  const res = createRes()

  await createKeys(req, res)

  expect(res.statusCode).toBe(401)
})

test("createKeys returns 400 when missing publicKey", async () => {
  const req = { headers: { authorization: "Bearer t" }, body: {} }
  const res = createRes()
  extractUserFromToken.mockReturnValue({ id: 2 })

  await createKeys(req, res)

  expect(res.statusCode).toBe(400)
})

test("createKeys stores key and returns 201", async () => {
  const req = { headers: { authorization: "Bearer t" }, body: { publicKey: "P" } }
  const res = createRes()
  extractUserFromToken.mockReturnValue({ id: 2 })
  prisma.user.update.mockResolvedValue({ publicKey: "P" })

  await createKeys(req, res)

  expect(res.statusCode).toBe(201)
  expect(res.body).toEqual({ publicKey: "P" })
})

// updateKeys
test("updateKeys returns 400 when neither key provided", async () => {
  const req = { headers: { authorization: "Bearer t" }, body: {} }
  const res = createRes()
  extractUserFromToken.mockReturnValue({ id: 3 })

  await updateKeys(req, res)

  expect(res.statusCode).toBe(400)
})

test("updateKeys updates provided keys and returns them", async () => {
  const req = { headers: { authorization: "Bearer t" }, body: { publicKey: "P2" } }
  const res = createRes()
  extractUserFromToken.mockReturnValue({ id: 3 })
  prisma.user.update.mockResolvedValue({ publicKey: "P2", signingPublicKey: "S2" })

  await updateKeys(req, res)

  expect(res.body).toEqual({ publicKey: "P2", signingPublicKey: "S2" })
})

// updateSigningKey
test("updateSigningKey returns 400 when missing signingPublicKey", async () => {
  const req = { headers: { authorization: "Bearer t" }, body: {} }
  const res = createRes()
  extractUserFromToken.mockReturnValue({ id: 4 })

  await updateSigningKey(req, res)

  expect(res.statusCode).toBe(400)
})

test("updateSigningKey updates and returns signing key", async () => {
  const req = { headers: { authorization: "Bearer t" }, body: { signingPublicKey: "SK" } }
  const res = createRes()
  extractUserFromToken.mockReturnValue({ id: 4 })
  prisma.user.update.mockResolvedValue({ signingPublicKey: "SK" })

  await updateSigningKey(req, res)

  expect(res.body).toEqual({ signingPublicKey: "SK" })
})

// createPreKeys
test("createPreKeys validates input and returns 400 for invalid body", async () => {
  const req = { headers: { authorization: "Bearer t" }, body: [] }
  const res = createRes()
  extractUserFromToken.mockReturnValue({ id: 5 })

  await createPreKeys(req, res)

  expect(res.statusCode).toBe(400)
})

test("createPreKeys stores multiple prekeys and returns count", async () => {
  const req = { headers: { authorization: "Bearer t" }, body: [{ type: 1, publicKey: "A" }] }
  const res = createRes()
  extractUserFromToken.mockReturnValue({ id: 5 })
  prisma.preKey.createMany.mockResolvedValue({ count: 1 })

  await createPreKeys(req, res)

  expect(res.statusCode).toBe(201)
  expect(res.body).toEqual({ message: "PreKeys created", count: 1 })
})

// getPreKeys
test("getPreKeys returns 401 without auth", async () => {
  const req = { headers: {}, query: {} }
  const res = createRes()

  await getPreKeys(req, res)

  expect(res.statusCode).toBe(401)
})

test("getPreKeys returns preKeys for target userId or requesting user", async () => {
  const req = { headers: { authorization: "Bearer t" }, query: { userId: "7" } }
  const res = createRes()
  extractUserFromToken.mockReturnValue({ id: 6 })
  prisma.preKey.findMany.mockResolvedValue([{ id: 1, userId: 7 }])

  await getPreKeys(req, res)

  expect(res.body).toEqual({ preKeys: [{ id: 1, userId: 7 }] })
})

test("getPreKeys handles DB error -> 500", async () => {
  const req = { headers: { authorization: "Bearer t" }, query: {} }
  const res = createRes()
  extractUserFromToken.mockReturnValue({ id: 6 })
  prisma.preKey.findMany.mockRejectedValue(new Error("boom"))

  await getPreKeys(req, res)

  expect(res.statusCode).toBe(500)
})
