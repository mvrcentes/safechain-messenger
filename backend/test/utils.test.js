import { test, expect, beforeEach, vi } from "vitest"

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

test("extractUserFromToken returns null when no Authorization header", async () => {
  const { extractUserFromToken } = await import("../src/lib/utils.js")
  const req = { headers: {} }
  expect(extractUserFromToken(req)).toBeNull()
})

test("extractUserFromToken returns null when header not Bearer", async () => {
  const { extractUserFromToken } = await import("../src/lib/utils.js")
  const req = { headers: { authorization: "Token abc" } }
  expect(extractUserFromToken(req)).toBeNull()
})

test("extractUserFromToken returns null on invalid token", async () => {
  const verifyMock = vi.fn(() => { throw new Error("invalid") })
  vi.doMock("jsonwebtoken", () => ({ default: { verify: verifyMock } }))
  process.env.JWT_SECRET = "s"
  const { extractUserFromToken } = await import("../src/lib/utils.js")

  const req = { headers: { authorization: "Bearer badtoken" } }
  expect(extractUserFromToken(req)).toBeNull()
  expect(verifyMock).toHaveBeenCalledWith("badtoken", "s")
})

test("extractUserFromToken returns payload for valid token", async () => {
  const payload = { id: 1, email: "a@b.com" }
  const verifyMock = vi.fn(() => payload)
  vi.doMock("jsonwebtoken", () => ({ default: { verify: verifyMock } }))
  process.env.JWT_SECRET = "topsecret"
  const { extractUserFromToken } = await import("../src/lib/utils.js")

  const req = { headers: { authorization: "Bearer validtoken" } }
  expect(extractUserFromToken(req)).toEqual(payload)
  expect(verifyMock).toHaveBeenCalledWith("validtoken", "topsecret")
})
