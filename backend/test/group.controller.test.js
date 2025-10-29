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

test("createGroup returns 401 when unauthorized", async () => {
  vi.doMock("../src/lib/utils.js", () => ({ extractUserFromToken: () => null }))
  const { createGroup } = await import("../src/controllers/user/group.controller.js")

  const req = { body: {} }
  const res = makeRes()

  await createGroup(req, res)

  expect(res.status).toHaveBeenCalledWith(401)
  expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" })
})

test("createGroup validates input and returns 400 when missing fields", async () => {
  vi.doMock("../src/lib/utils.js", () => ({ extractUserFromToken: () => ({ id: 1 }) }))
  const { createGroup } = await import("../src/controllers/user/group.controller.js")

  const req = { body: { name: "", memberIds: "not-an-array" } }
  const res = makeRes()

  await createGroup(req, res)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({ error: "Missing group name or member IDs" })
})

test("createGroup creates group and deliveries on success", async () => {
  const user = { id: 10 }
  const group = { id: 5, name: "Test Group" }

  const groupCreate = vi.fn().mockResolvedValue(group)
  const createMany = vi.fn().mockResolvedValue({})

  vi.doMock("../src/lib/utils.js", () => ({ extractUserFromToken: () => user }))
  vi.doMock("../src/database.js", () => ({ default: { group: { create: groupCreate }, groupKeyDelivery: { createMany } } }))

  const { createGroup } = await import("../src/controllers/user/group.controller.js")

  const body = {
    name: "G",
    memberIds: [2, 3],
    kGroupDeliveries: [
      { userId: 2, encryptedKey: "ek1", opkHash: "h1" },
      { userId: 3, encryptedKey: "ek2" },
    ],
    ephemeralKey: "epk",
  }

  const req = { body }
  const res = makeRes()

  await createGroup(req, res)

  expect(groupCreate).toHaveBeenCalled()
  expect(createMany).toHaveBeenCalledWith({
    data: expect.arrayContaining([
      expect.objectContaining({ groupId: group.id, userId: 2 }),
      expect.objectContaining({ groupId: group.id, userId: 3 }),
    ]),
  })
  expect(res.status).toHaveBeenCalledWith(201)
  expect(res.json).toHaveBeenCalledWith(group)
})

test("createGroup handles DB errors and returns 500", async () => {
  const user = { id: 10 }
  const groupCreate = vi.fn().mockRejectedValue(new Error("boom"))
  vi.doMock("../src/lib/utils.js", () => ({ extractUserFromToken: () => user }))
  vi.doMock("../src/database.js", () => ({ default: { group: { create: groupCreate }, groupKeyDelivery: { createMany: vi.fn() } } }))

  const { createGroup } = await import("../src/controllers/user/group.controller.js")
  const req = { body: { name: "G", memberIds: [2] , kGroupDeliveries: [], ephemeralKey: null } }
  const res = makeRes()

  await createGroup(req, res)

  expect(res.status).toHaveBeenCalledWith(500)
  expect(res.json).toHaveBeenCalledWith({ error: "Failed to create group" })
})

test("getUserGroups returns 401 when unauthorized", async () => {
  vi.doMock("../src/lib/utils.js", () => ({ extractUserFromToken: () => null }))
  const { getUserGroups } = await import("../src/controllers/user/group.controller.js")

  const req = {}
  const res = makeRes()

  await getUserGroups(req, res)

  expect(res.status).toHaveBeenCalledWith(401)
})

test("getUserGroups fetches groups and returns them", async () => {
  const user = { id: 7 }
  const groups = [{ id: 1, name: "G1", members: [] }]

  const findMany = vi.fn().mockResolvedValue(groups)
  vi.doMock("../src/lib/utils.js", () => ({ extractUserFromToken: () => user }))
  vi.doMock("../src/database.js", () => ({ default: { group: { findMany } } }))

  const { getUserGroups } = await import("../src/controllers/user/group.controller.js")
  const req = {}
  const res = makeRes()

  await getUserGroups(req, res)

  expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.any(Object), include: { members: true } }))
  expect(res.json).toHaveBeenCalledWith(groups)
})

test("getUserGroups handles DB errors and returns 500", async () => {
  const user = { id: 7 }
  const findMany = vi.fn().mockRejectedValue(new Error("boom"))
  vi.doMock("../src/lib/utils.js", () => ({ extractUserFromToken: () => user }))
  vi.doMock("../src/database.js", () => ({ default: { group: { findMany } } }))

  const { getUserGroups } = await import("../src/controllers/user/group.controller.js")
  const req = {}
  const res = makeRes()

  await getUserGroups(req, res)

  expect(res.status).toHaveBeenCalledWith(500)
})

test("sendGroupMessage returns 401 when unauthorized", async () => {
  vi.doMock("../src/lib/utils.js", () => ({ extractUserFromToken: () => null }))
  const { sendGroupMessage } = await import("../src/controllers/user/group.controller.js")
  const req = { params: { groupId: "1" }, body: { content: "hi" } }
  const res = makeRes()

  await sendGroupMessage(req, res)

  expect(res.status).toHaveBeenCalledWith(401)
})

test("sendGroupMessage validates input and returns 400", async () => {
  vi.doMock("../src/lib/utils.js", () => ({ extractUserFromToken: () => ({ id: 1 }) }))
  const { sendGroupMessage } = await import("../src/controllers/user/group.controller.js")
  const req = { params: { groupId: "not-a-number" }, body: { content: "" } }
  const res = makeRes()

  await sendGroupMessage(req, res)

  expect(res.status).toHaveBeenCalledWith(400)
})

test("sendGroupMessage creates message on success", async () => {
  const user = { id: 9 }
  const created = { id: 11, content: "hey" }
  const msgCreate = vi.fn().mockResolvedValue(created)

  vi.doMock("../src/lib/utils.js", () => ({ extractUserFromToken: () => user }))
  vi.doMock("../src/database.js", () => ({ default: { message: { create: msgCreate } } }))

  const { sendGroupMessage } = await import("../src/controllers/user/group.controller.js")
  const req = { params: { groupId: "2" }, body: { content: "hey" } }
  const res = makeRes()

  await sendGroupMessage(req, res)

  expect(msgCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ fromUserId: user.id, groupId: 2 }) }))
  expect(res.status).toHaveBeenCalledWith(201)
  expect(res.json).toHaveBeenCalledWith(created)
})

test("sendGroupMessage handles DB errors and returns 500", async () => {
  const user = { id: 9 }
  const msgCreate = vi.fn().mockRejectedValue(new Error("boom"))
  vi.doMock("../src/lib/utils.js", () => ({ extractUserFromToken: () => user }))
  vi.doMock("../src/database.js", () => ({ default: { message: { create: msgCreate } } }))

  const { sendGroupMessage } = await import("../src/controllers/user/group.controller.js")
  const req = { params: { groupId: "2" }, body: { content: "hey" } }
  const res = makeRes()

  await sendGroupMessage(req, res)

  expect(res.status).toHaveBeenCalledWith(500)
})

test("getEncryptedGroupKey returns 400 when groupId missing", async () => {
  const user = { id: 42 }
  vi.doMock("../src/lib/utils.js", () => ({ extractUserFromToken: () => user }))

  const { getEncryptedGroupKey } = await import("../src/controllers/user/group.controller.js")
  const req = { params: {} }
  const res = makeRes()
  await getEncryptedGroupKey(req, res)
  expect(res.status).toHaveBeenCalledWith(400)
})

test("getEncryptedGroupKey returns 404 when key not found", async () => {
  const user = { id: 42 }
  vi.doMock("../src/lib/utils.js", () => ({ extractUserFromToken: () => user }))
  const findUnique = vi.fn().mockResolvedValue(null)
  vi.doMock("../src/database.js", () => ({ default: { groupKeyDelivery: { findUnique } } }))

  const { getEncryptedGroupKey } = await import("../src/controllers/user/group.controller.js")
  const req = { params: { groupId: "1" } }
  const res = makeRes()
  await getEncryptedGroupKey(req, res)
  expect(res.status).toHaveBeenCalledWith(404)
})

test("getEncryptedGroupKey returns keys on success", async () => {
  const user = { id: 42 }
  vi.doMock("../src/lib/utils.js", () => ({ extractUserFromToken: () => user }))
  const keyDelivery = { encryptedKey: "ek", ephemeralKey: "epk", opkHash: "h" }
  const findUnique2 = vi.fn().mockResolvedValue(keyDelivery)
  vi.doMock("../src/database.js", () => ({ default: { groupKeyDelivery: { findUnique: findUnique2 } } }))

  const { getEncryptedGroupKey } = await import("../src/controllers/user/group.controller.js")
  const req = { params: { groupId: "1" } }
  const res = makeRes()
  await getEncryptedGroupKey(req, res)
  expect(res.json).toHaveBeenCalledWith({ encryptedKey: keyDelivery.encryptedKey, ephemeralKey: keyDelivery.ephemeralKey, opkUsed: keyDelivery.opkHash })
})

test("getEncryptedGroupKey handles DB errors and returns 500", async () => {
  const user = { id: 42 }
  vi.doMock("../src/lib/utils.js", () => ({ extractUserFromToken: () => user }))
  const findUnique3 = vi.fn().mockRejectedValue(new Error("boom"))
  vi.doMock("../src/database.js", () => ({ default: { groupKeyDelivery: { findUnique: findUnique3 } } }))

  const { getEncryptedGroupKey } = await import("../src/controllers/user/group.controller.js")
  const req = { params: { groupId: "1" } }
  const res = makeRes()
  await getEncryptedGroupKey(req, res)
  expect(res.status).toHaveBeenCalledWith(500)
})
