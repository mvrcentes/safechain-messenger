import { jest } from "@jest/globals"

jest.unstable_mockModule("../src/database.js", () => ({
  default: {
    group: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    groupKeyDelivery: {
      createMany: jest.fn(),
    },
  },
}))

jest.unstable_mockModule("../src/lib/utils.js", () => ({
  extractUserFromToken: jest.fn(),
}))

const prisma = (await import("../src/database.js")).default
const { extractUserFromToken } = await import("../src/lib/utils.js")
const {
  createGroup,
  getUserGroups,
} = await import("../src/controllers/user/group.controller.js")

describe("createGroup", () => {
  let req, res

  beforeEach(() => {
    req = {
      body: {
        name: "Test Group",
        memberIds: [2, 3],
        kGroupDeliveries: [
          { userId: 2, encryptedKey: "abc", opkHash: "opk1" },
          { userId: 3, encryptedKey: "def", opkHash: null },
        ],
        ephemeralKey: "ephemeral",
      },
    }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    extractUserFromToken.mockReturnValue({ id: 1 })
  })

  it("crea un grupo con claves y miembros", async () => {
    prisma.group.create.mockResolvedValue({ id: 5, name: "Test Group" })
    prisma.groupKeyDelivery.createMany.mockResolvedValue({ count: 2 })

    await createGroup(req, res)

    expect(prisma.group.create).toHaveBeenCalled()
    expect(prisma.groupKeyDelivery.createMany).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ id: 5, name: "Test Group" })
  })

  it("responde 400 si faltan campos", async () => {
    req.body = { name: null, memberIds: "not-array" }

    await createGroup(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: "Missing group name or member IDs",
    })
  })

  it("responde 401 si el token no es válido", async () => {
    extractUserFromToken.mockReturnValue(null)

    await createGroup(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" })
  })
})

describe("getUserGroups", () => {
  let req, res

  beforeEach(() => {
    req = { headers: {} }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    extractUserFromToken.mockReturnValue({ id: 1 })
  })

  it("devuelve grupos del usuario", async () => {
    prisma.group.findMany.mockResolvedValue([{ id: 1, name: "Grupo1" }])

    await getUserGroups(req, res)

    expect(prisma.group.findMany).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith([{ id: 1, name: "Grupo1" }])
  })

  it("responde 401 si no hay token", async () => {
    extractUserFromToken.mockReturnValue(null)

    await getUserGroups(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" })
  })
})

describe("sendGroupMessage", () => {
  let req, res

  beforeEach(() => {
    req = {
      params: { groupId: "1" },
      body: { content: "Hola grupo" },
    }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    extractUserFromToken.mockReturnValue({ id: 1 })
    prisma.message = { create: jest.fn() }
  })

  it("crea y responde con un mensaje de grupo", async () => {
    prisma.message.create.mockResolvedValue({
      id: 123,
      content: "Hola grupo",
      groupId: 1,
      fromUserId: 1,
    })

    const { sendGroupMessage } = await import("../src/controllers/user/group.controller.js")
    await sendGroupMessage(req, res)

    expect(prisma.message.create).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ content: "Hola grupo" }))
  })

  it("responde 400 si falta contenido o id", async () => {
    req.body.content = ""
    const { sendGroupMessage } = await import("../src/controllers/user/group.controller.js")
    await sendGroupMessage(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }))
  })
})

describe("getEncryptedGroupKey", () => {
  let req, res

  beforeEach(() => {
    req = { params: { groupId: "1" } }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    extractUserFromToken.mockReturnValue({ id: 1 })
    prisma.groupKeyDelivery = { findUnique: jest.fn() }
  })

  it("devuelve claves del grupo cifradas", async () => {
    prisma.groupKeyDelivery.findUnique.mockResolvedValue({
      encryptedKey: "abc123",
      ephemeralKey: "tempkey",
      opkHash: "hash123",
    })

    const { getEncryptedGroupKey } = await import("../src/controllers/user/group.controller.js")
    await getEncryptedGroupKey(req, res)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ encryptedKey: "abc123" }))
  })

  it("responde 404 si no encuentra clave", async () => {
    prisma.groupKeyDelivery.findUnique.mockResolvedValue(null)

    const { getEncryptedGroupKey } = await import("../src/controllers/user/group.controller.js")
    await getEncryptedGroupKey(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }))
  })
})