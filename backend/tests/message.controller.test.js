

import { jest } from "@jest/globals"

jest.unstable_mockModule("../src/database.js", () => ({
  default: {
    message: {
      findMany: jest.fn(),
    },
  },
}))

jest.unstable_mockModule("../src/lib/utils.js", () => ({
  extractUserFromToken: jest.fn(),
}))

const { getMessagesWithUser } = await import(
  "../src/controllers/message/message.controller.js"
)
const prisma = (await import("../src/database.js")).default
const { extractUserFromToken } = await import("../src/lib/utils.js")

describe("getMessagesWithUser", () => {
  let req, res

  beforeEach(() => {
    req = {
      headers: {
        authorization: "Bearer token",
      },
      params: {
        userId: "2",
      },
    }

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    extractUserFromToken.mockReturnValue({ id: 1 })
  })

  it("devuelve mensajes directos entre dos usuarios", async () => {
    prisma.message.findMany.mockResolvedValue([{ id: 1, content: "Hola" }])

    await getMessagesWithUser(req, res)

    expect(prisma.message.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { fromUserId: 1, toUserId: 2 },
          { fromUserId: 2, toUserId: 1 },
        ],
      },
      orderBy: { createdAt: "asc" },
    })

    expect(res.json).toHaveBeenCalledWith([{ id: 1, content: "Hola" }])
  })

  it("devuelve mensajes de grupo si el userId es 'group-ID'", async () => {
    req.params.userId = "group-5"
    prisma.message.findMany.mockResolvedValue([{ id: 99, content: "Mensaje grupal" }])

    await getMessagesWithUser(req, res)

    expect(prisma.message.findMany).toHaveBeenCalledWith({
      where: { groupId: 5 },
      orderBy: { createdAt: "asc" },
    })

    expect(res.json).toHaveBeenCalledWith([{ id: 99, content: "Mensaje grupal" }])
  })

  it("responde 400 si el ID de grupo es inválido", async () => {
    req.params.userId = "group-abc"

    await getMessagesWithUser(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid group ID" })
  })

  it("responde 400 si el ID de usuario es inválido", async () => {
    req.params.userId = "abc"

    await getMessagesWithUser(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid user ID" })
  })

  it("responde 401 si no hay token", async () => {
    req.headers.authorization = undefined

    await getMessagesWithUser(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" })
  })
})