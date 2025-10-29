import { describe, it, expect, vi, beforeEach } from "vitest"

// We'll reset modules per test so we can do per-test mocking of prisma and controllers
describe("socketManager setupWebSocket", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  function makeWss() {
    let connectionHandler
    return {
      on: (evt, handler) => {
        if (evt === "connection") connectionHandler = handler
      },
      // helper for tests to simulate a new connection
      connect(ws) {
        connectionHandler(ws)
      },
    }
  }

  function makeWs() {
    const handlers = {}
    return {
      on: (evt, handler) => {
        handlers[evt] = handler
      },
      send: vi.fn(),
      // helpers to simulate events
      _emitMessage(data) {
        return handlers.message && handlers.message(data)
      },
      _emitClose() {
        return handlers.close && handlers.close()
      },
    }
  }

  it("registers client on init and delivers direct message to recipient", async () => {
    // mock prisma and blockchain entry
    const messageCreate = vi.fn(async ({ data }) => ({ id: "mid", createdAt: "t", ...data }))
    const prismaMock = { message: { create: messageCreate } }
    vi.doMock("../src/database.js", () => ({ default: prismaMock }))

    const createBlockchainEntry = vi.fn(() => Promise.resolve())
    vi.doMock("../src/controllers/blockchain/blockchain.controller.js", () => ({ createBlockchainEntry }))

    const { setupWebSocket } = await import("../src/websocket/socketManager.js")

    const wss = makeWss()
    setupWebSocket(wss)

    const recipient = makeWs()
    const sender = makeWs()

    // connect both
    wss.connect(recipient)
    wss.connect(sender)

    // register recipient as user 'alice'
    await recipient._emitMessage(JSON.stringify({ type: "init", userId: "alice" }))

    // send a message from bob to alice with HTML to ensure sanitization
    const msg = { type: "message", to: "alice", from: "bob", content: "<b>hi</b>" }
    await sender._emitMessage(JSON.stringify(msg))

    // prisma should have been called to create message
    expect(messageCreate).toHaveBeenCalled()
    // blockchain entry should be scheduled
    expect(createBlockchainEntry).toHaveBeenCalledWith("mid", "hi")
    // recipient should receive sanitized message
    expect(recipient.send).toHaveBeenCalled()
    const sent = JSON.parse(recipient.send.mock.calls[0][0])
    expect(sent.type).toBe("message")
    expect(sent.fromUserId).toBe("bob")
    expect(sent.toUserId).toBe("alice")
    expect(sent.content).toBe("hi")
    expect(sent.id).toBe("mid")
  })

  it("sends group-message to all group members", async () => {
    const messageCreate = vi.fn(async ({ data }) => ({ id: "gmid", createdAt: "t", ...data }))
    const groupFind = vi.fn(async () => ({ id: "g1", members: [{ id: "m1" }, { id: "m2" }] }))
    const prismaMock = { message: { create: messageCreate }, group: { findUnique: groupFind } }
    vi.doMock("../src/database.js", () => ({ default: prismaMock }))

    const createBlockchainEntry = vi.fn(() => Promise.resolve())
    vi.doMock("../src/controllers/blockchain/blockchain.controller.js", () => ({ createBlockchainEntry }))

    const { setupWebSocket } = await import("../src/websocket/socketManager.js")

    const wss = makeWss()
    setupWebSocket(wss)

    const member1 = makeWs()
    const member2 = makeWs()
    const sender = makeWs()

    wss.connect(member1)
    wss.connect(member2)
    wss.connect(sender)

    // register members
    await member1._emitMessage(JSON.stringify({ type: "init", userId: "m1" }))
    await member2._emitMessage(JSON.stringify({ type: "init", userId: "m2" }))

    const groupMsg = { type: "group-message", from: "alice", groupId: "g1", content: "hello <i>all</i>" }
    await sender._emitMessage(JSON.stringify(groupMsg))

    expect(messageCreate).toHaveBeenCalled()
    expect(groupFind).toHaveBeenCalledWith({ where: { id: "g1" }, include: { members: true } })
    expect(member1.send).toHaveBeenCalled()
    expect(member2.send).toHaveBeenCalled()
    const sent1 = JSON.parse(member1.send.mock.calls[0][0])
    expect(sent1.type).toBe("group-message")
    expect(sent1.groupId).toBe("g1")
  })

  it("disconnect message removes client so subsequent messages are not delivered", async () => {
    const messageCreate = vi.fn(async ({ data }) => ({ id: "mid", createdAt: "t", ...data }))
    const prismaMock = { message: { create: messageCreate } }
    vi.doMock("../src/database.js", () => ({ default: prismaMock }))
    vi.doMock("../src/controllers/blockchain/blockchain.controller.js", () => ({ createBlockchainEntry: vi.fn() }))

    const { setupWebSocket } = await import("../src/websocket/socketManager.js")

    const wss = makeWss()
    setupWebSocket(wss)

    const recipient = makeWs()
    const sender = makeWs()

    wss.connect(recipient)
    wss.connect(sender)

    await recipient._emitMessage(JSON.stringify({ type: "init", userId: "bob" }))

    // now send disconnect
    await recipient._emitMessage(JSON.stringify({ type: "disconnect", userId: "bob" }))

    // send message to bob - should not be delivered
    await sender._emitMessage(JSON.stringify({ type: "message", to: "bob", from: "eve", content: "x" }))

    expect(recipient.send).not.toHaveBeenCalled()
  })

  it("close event cleans up clients mapping", async () => {
    const messageCreate = vi.fn(async ({ data }) => ({ id: "mid", createdAt: "t", ...data }))
    const prismaMock = { message: { create: messageCreate } }
    vi.doMock("../src/database.js", () => ({ default: prismaMock }))
    vi.doMock("../src/controllers/blockchain/blockchain.controller.js", () => ({ createBlockchainEntry: vi.fn() }))

    const { setupWebSocket } = await import("../src/websocket/socketManager.js")

    const wss = makeWss()
    setupWebSocket(wss)

    const client = makeWs()
    const sender = makeWs()
    wss.connect(client)
    wss.connect(sender)

    await client._emitMessage(JSON.stringify({ type: "init", userId: "userX" }))

    // simulate ws close event
    client._emitClose()

    // now sender tries to send message to userX
    await sender._emitMessage(JSON.stringify({ type: "message", to: "userX", from: "someone", content: "hi" }))

    expect(client.send).not.toHaveBeenCalled()
  })
})
