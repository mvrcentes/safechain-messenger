import { test, expect, vi, beforeEach } from "vitest"

beforeEach(() => {
  // Ensure a clean module registry and mocks before each test because
  // `src/database.js` runs a connect on import.
  vi.resetModules()
  vi.clearAllMocks()
})

test("prisma client connects successfully and is exported", async () => {
  const connectMock = vi.fn().mockResolvedValue(undefined)
  const prismaInstance = { $connect: connectMock, $disconnect: vi.fn() }

  // Mock the @prisma/client package BEFORE importing the module under test.
  // `src/database.js` does a default import: `import pkg from "@prisma/client"`
  // so the mock must provide a `default` export containing `PrismaClient`.
  // Use doMock so the factory runs at call time and can close over test-local
  // variables (vitest hoists vi.mock calls which would run before local vars
  // are assigned).
  vi.doMock("@prisma/client", () => ({ default: { PrismaClient: function () { return prismaInstance } } }))

  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})

  const { default: prisma } = await import("../src/database.js")

  // allow the promise microtask (the module calls prisma.$connect().then(...))
  await new Promise((r) => setImmediate(r))

  expect(connectMock).toHaveBeenCalled()
  expect(prisma).toBe(prismaInstance)
  expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Connected to the database"))

  logSpy.mockRestore()
})

test("prisma client connection failure is logged", async () => {
  const err = new Error("boom")
  const connectMock = vi.fn().mockRejectedValue(err)
  const prismaInstance = { $connect: connectMock, $disconnect: vi.fn() }

  vi.doMock("@prisma/client", () => ({ default: { PrismaClient: function () { return prismaInstance } } }))

  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

  // Import module; the rejected promise should be caught and logged by the module
  const { default: prisma } = await import("../src/database.js")

  // wait a tick for the rejection handler to run
  await new Promise((r) => setImmediate(r))

  expect(connectMock).toHaveBeenCalled()
  expect(prisma).toBe(prismaInstance)
  expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Error connecting to the database (Prisma)"), err)

  errorSpy.mockRestore()
})

test("prisma client constructor throws -> fallback stub is exported", async () => {
  const ctorErr = new Error("ctor boom")
  // Mock PrismaClient constructor to throw synchronously
  vi.doMock("@prisma/client", () => ({ default: { PrismaClient: function () { throw ctorErr } } }))

  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

  const { default: prisma } = await import("../src/database.js")

  // The module should have logged the initialization failure and exported a stub
  expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Prisma client initialization failed, using fallback stub:"), expect.any(Error))
  // Fallback provides $connect that resolves
  await expect(prisma.$connect()).resolves.toBeUndefined()
  // group.findMany from stub returns array
  await expect(prisma.group.findMany()).resolves.toEqual([])
  // group.create stub throws
  await expect(prisma.group.create()).rejects.toThrow("Prisma client unavailable")

  errorSpy.mockRestore()
})
