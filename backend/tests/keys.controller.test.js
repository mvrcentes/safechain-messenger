import { jest } from "@jest/globals"

jest.unstable_mockModule("../src/database.js", () => ({
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    preKey: {
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

jest.unstable_mockModule("../src/lib/utils.js", () => ({
  extractUserFromToken: jest.fn(),
}))

const prisma = (await import("../src/database.js")).default
const { extractUserFromToken } = await import("../src/lib/utils.js")
const {
  getSigningPublicKey,
  getKeys,
  createKeys,
  updateKeys,
  updateSigningKey,
  createPreKeys,
  getPreKeys,
} = await import("../src/controllers/keys/keys.controller.js")

describe("getSigningPublicKey", () => {
  it("returns 404 if signing key is missing", async () => {
    const req = { params: { id: "1" } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    prisma.user.findUnique.mockResolvedValue({ signingPublicKey: null })

    await getSigningPublicKey(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: "Signing key not found" })
  })

  it("returns 404 if user is not found", async () => {
    const req = { params: { id: "1" } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    prisma.user.findUnique.mockResolvedValue(null)

    await getSigningPublicKey(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: "Signing key not found" })
  })

  it("returns 500 on unexpected error", async () => {
    const req = { params: { id: "1" } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    prisma.user.findUnique.mockRejectedValue(new Error("DB failure"))

    await getSigningPublicKey(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch signing public key" })
  })
})

describe("getKeys", () => {
  it("returns 401 if unauthorized", async () => {
    const req = { headers: {} }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }

    await getKeys(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalled()
  })

  it("returns keys if available", async () => {
    const req = { headers: { authorization: "Bearer token" } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    extractUserFromToken.mockReturnValue({ id: 1 })
    prisma.user.findUnique.mockResolvedValue({
      publicKey: "abc",
      signingPublicKey: "xyz",
    })

    await getKeys(req, res)

    expect(res.json).toHaveBeenCalledWith({
      publicKey: "abc",
      signingPublicKey: "xyz",
    })
  })

  it("returns 404 if keys are not found", async () => {
    const req = { headers: { authorization: "Bearer token" } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    extractUserFromToken.mockReturnValue({ id: 1 })
    prisma.user.findUnique.mockResolvedValue({})

    await getKeys(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: "Keys not found" })
  })

  it("returns 500 if error occurs fetching keys", async () => {
    const req = { headers: { authorization: "Bearer token" } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    extractUserFromToken.mockReturnValue({ id: 1 })
    prisma.user.findUnique.mockRejectedValue(new Error("Prisma error"))

    await getKeys(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch keys" })
  })
})

describe("createKeys", () => {
  it("creates public key", async () => {
    const req = {
      headers: { authorization: "Bearer token" },
      body: { publicKey: "abc" },
    }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    extractUserFromToken.mockReturnValue({ id: 1 })
    prisma.user.update.mockResolvedValue({ publicKey: "abc" })

    await createKeys(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ publicKey: "abc" })
  })

  it("returns 400 if publicKey is missing", async () => {
    const req = {
      headers: { authorization: "Bearer token" },
      body: {},
    }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    extractUserFromToken.mockReturnValue({ id: 1 })

    await createKeys(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: "Missing public key" })
  })

  it("returns 500 if error occurs creating keys", async () => {
    const req = {
      headers: { authorization: "Bearer token" },
      body: { publicKey: "abc" },
    }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    extractUserFromToken.mockReturnValue({ id: 1 })
    prisma.user.update.mockRejectedValue(new Error("Prisma error"))

    await createKeys(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to create keys" })
  })
})

describe("updateKeys", () => {
  it("updates both keys", async () => {
    const req = {
      headers: { authorization: "Bearer token" },
      body: { publicKey: "abc", signingPublicKey: "xyz" },
    }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    extractUserFromToken.mockReturnValue({ id: 1 })
    prisma.user.update.mockResolvedValue({
      publicKey: "abc",
      signingPublicKey: "xyz",
    })

    await updateKeys(req, res)

    expect(res.json).toHaveBeenCalledWith({
      publicKey: "abc",
      signingPublicKey: "xyz",
    })
  })

  it("returns 400 if no keys are provided", async () => {
    const req = {
      headers: { authorization: "Bearer token" },
      body: {},
    }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    extractUserFromToken.mockReturnValue({ id: 1 })

    await updateKeys(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: "Missing public or signing public key" })
  })

  it("returns 500 if error occurs updating keys", async () => {
    const req = {
      headers: { authorization: "Bearer token" },
      body: { publicKey: "abc" },
    }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    extractUserFromToken.mockReturnValue({ id: 1 })
    prisma.user.update.mockRejectedValue(new Error("Prisma error"))

    await updateKeys(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to update keys" })
  })
})

describe("updateSigningKey", () => {
  it("updates only signing key", async () => {
    const req = {
      headers: { authorization: "Bearer token" },
      body: { signingPublicKey: "xyz" },
    }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    extractUserFromToken.mockReturnValue({ id: 1 })
    prisma.user.update.mockResolvedValue({ signingPublicKey: "xyz" })

    await updateSigningKey(req, res)

    expect(res.json).toHaveBeenCalledWith({ signingPublicKey: "xyz" })
  })

  it("returns 400 if signingPublicKey is missing", async () => {
    const req = {
      headers: { authorization: "Bearer token" },
      body: {},
    }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    extractUserFromToken.mockReturnValue({ id: 1 })

    await updateSigningKey(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: "Missing signing public key" })
  })

  it("returns 500 if error occurs updating signing key", async () => {
    const req = {
      headers: { authorization: "Bearer token" },
      body: { signingPublicKey: "xyz" },
    }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    extractUserFromToken.mockReturnValue({ id: 1 })
    prisma.user.update.mockRejectedValue(new Error("Prisma error"))

    await updateSigningKey(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to update signing key" })
  })
})

describe("createPreKeys", () => {
  it("creates multiple preKeys", async () => {
    const req = {
      headers: { authorization: "Bearer token" },
      body: [
        { type: "OPK", publicKey: "abc" },
        { type: "OPK", publicKey: "def" },
      ],
    }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    extractUserFromToken.mockReturnValue({ id: 1 })
    prisma.preKey.createMany.mockResolvedValue({ count: 2 })

    await createPreKeys(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({
      message: "PreKeys created",
      count: 2,
    })
  })

  it("returns 400 if preKeys body is missing or invalid", async () => {
    const req = {
      headers: { authorization: "Bearer token" },
      body: null,
    }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    extractUserFromToken.mockReturnValue({ id: 1 })

    await createPreKeys(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid or missing preKeys" })
  })

  it("returns 500 if error occurs creating PreKeys", async () => {
    const req = {
      headers: { authorization: "Bearer token" },
      body: [{ type: "OPK", publicKey: "abc" }],
    }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    extractUserFromToken.mockReturnValue({ id: 1 })
    prisma.preKey.createMany.mockRejectedValue(new Error("Prisma error"))

    await createPreKeys(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to create PreKeys" })
  })
})

describe("getPreKeys", () => {
  it("returns preKeys for given user", async () => {
    const req = {
      headers: { authorization: "Bearer token" },
      query: { userId: "1" },
    }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    extractUserFromToken.mockReturnValue({ id: 99 })
    prisma.preKey.findMany.mockResolvedValue([{ id: 1, type: "OPK" }])

    await getPreKeys(req, res)

    expect(res.json).toHaveBeenCalledWith({
      preKeys: [{ id: 1, type: "OPK" }],
    })
  })

  it("returns 500 if error occurs fetching pre-keys", async () => {
    const req = {
      headers: { authorization: "Bearer token" },
      query: { userId: "1" },
    }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    extractUserFromToken.mockReturnValue({ id: 99 })
    prisma.preKey.findMany.mockRejectedValue(new Error("Prisma error"))

    await getPreKeys(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch pre-keys" })
  })
})