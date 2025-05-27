import { jest } from "@jest/globals"

jest.unstable_mockModule("../src/database.js", () => ({
  default: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

jest.unstable_mockModule("../src/lib/utils.js", () => ({
  extractUserFromToken: jest.fn(),
}))

const prisma = (await import("../src/database.js")).default
const { extractUserFromToken } = await import("../src/lib/utils.js")
const { getAllUsers, getPublicEncryptKey } = await import(
  "../src/controllers/user/user.controller.js"
)

describe("getAllUsers", () => {
  let req, res

  beforeEach(() => {
    req = { headers: {} }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
  })

  it("responde 401 si el token es inválido", async () => {
    extractUserFromToken.mockReturnValue(null)
    await getAllUsers(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid or missing token" })
  })

  it("devuelve usuarios sin incluir el usuario actual", async () => {
    extractUserFromToken.mockReturnValue({ email: "rebecca@example.com" })
    prisma.user.findMany.mockResolvedValue([{ id: 2, name: "Otra", email: "otra@example.com" }])

    await getAllUsers(req, res)

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { email: { not: "rebecca@example.com" } },
      select: { id: true, name: true, email: true },
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith([{ id: 2, name: "Otra", email: "otra@example.com" }])
  })
})

describe("getPublicEncryptKey", () => {
  let req, res

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
  })

  it("responde 400 si el ID no es válido", async () => {
    req = { params: { id: "abc" } }

    await getPublicEncryptKey(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid user ID" })
  })

  it("responde 404 si no encuentra clave pública", async () => {
    req = { params: { id: "2" } }
    prisma.user.findUnique.mockResolvedValue(null)

    await getPublicEncryptKey(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: "Public key not found" })
  })

  it("devuelve la clave pública si el usuario existe", async () => {
    req = { params: { id: "2" } }
    prisma.user.findUnique.mockResolvedValue({ publicKey: "abc123" })

    await getPublicEncryptKey(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ publicKey: "abc123" })
  })
})
