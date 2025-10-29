import { test, expect, vi, beforeEach } from "vitest"

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

test("index starts server, sets up websocket and logs URL", async () => {
  // Arrange: prepare mocks before importing the module under test
  const PORT = 6000

  // Mock app with get('port')
  vi.doMock("../src/app.js", () => ({
    default: { get: (key) => (key === "port" ? PORT : undefined) },
  }))

  // Mock database import so it doesn't run real connections
  vi.doMock("../src/database.js", () => ({}))

  // Mock http.createServer to return an object with listen. src/index.js
  // imports the module as a default import (`import http from "http"`),
  // so the mock must provide a `default` export containing `createServer`.
  const fakeServer = { listen: vi.fn((port, cb) => { fakeServer._port = port; if (cb) cb() }), on: vi.fn() }
  vi.doMock("http", () => ({ default: { createServer: (handler) => fakeServer } }))

  // Mock ws.WebSocketServer to capture instance
  function FakeWSS(opts) {
    this.opts = opts
  }
  FakeWSS.instances = []
  FakeWSS.prototype.on = function () {}
  vi.doMock("ws", () => ({ WebSocketServer: FakeWSS }))

  // Mock setupWebSocket and capture argument
  const setupWebSocket = vi.fn()
  vi.doMock("../src/websocket/socketManager.js", () => ({ setupWebSocket }))

  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})

  // Act: import the module (this will run the top-level code)
  await import("../src/index.js")

  // Assert: server.listen called with PORT
  expect(fakeServer._port).toBe(PORT)
  // setupWebSocket called with instance of FakeWSS (the module creates new WebSocketServer)
  expect(setupWebSocket).toHaveBeenCalled()
  // Console logged the running message
  expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(`Server running on http://localhost:${PORT}`))

  logSpy.mockRestore()
})
