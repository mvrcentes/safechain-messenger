import { test, expect, vi, beforeEach } from "vitest"

// We'll mock express-rate-limit so we can capture the options passed to it
let capturedOptions = null
const mockIpKeyGenerator = vi.fn((req) => `ip:${req.ip}`)

vi.mock("express-rate-limit", () => ({
  __esModule: true,
  default: (options) => {
    capturedOptions = options
    // return a dummy middleware function
    return (req, res, next) => next()
  },
  ipKeyGenerator: mockIpKeyGenerator,
}))

beforeEach(() => {
  // Do not reset `capturedOptions` here — the module import that sets it
  // runs once per test process. Clearing mocks is fine.
  vi.clearAllMocks()
})

test("middleware config is passed to rateLimit with expected values", async () => {
  // import after mock so our mock is used
  const mod = await import("../src/middleware/ipRateLimiter.js")

  expect(typeof capturedOptions).toBe("object")
  expect(capturedOptions.max).toBe(5)
  expect(capturedOptions.windowMs).toBe(15 * 60 * 1000)
  expect(capturedOptions.standardHeaders).toBe(true)
  expect(capturedOptions.legacyHeaders).toBe(false)
  expect(typeof capturedOptions.keyGenerator).toBe("function")
})

test("keyGenerator delegates to ipKeyGenerator", async () => {
  await import("../src/middleware/ipRateLimiter.js")
  const fakeReq = { ip: "1.2.3.4" }
  const result = capturedOptions.keyGenerator(fakeReq)
  expect(mockIpKeyGenerator).toHaveBeenCalledWith(fakeReq)
  expect(result).toBe(`ip:1.2.3.4`)
})

test("handler sets Retry-After header when resetTime present and returns 429 JSON", async () => {
  await import("../src/middleware/ipRateLimiter.js")
  // create a fake resetTime a few seconds in future
  const resetTime = new Date(Date.now() + 4500)

  const req = { ip: "1.2.3.4", originalUrl: "/api/auth/login", rateLimit: { resetTime } }
  const res = {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(k, v) {
      this.headers[k] = v
    },
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }

  // call handler
  const handler = capturedOptions.handler
  handler(req, res)

  expect(res.statusCode).toBe(429)
  expect(res.body).toEqual({ error: "Too many login attempts from this IP. Try again later." })
  expect(res.headers["Retry-After"]).toBeDefined()
  // header should be a string containing an integer number of seconds
  expect(/^[0-9]+$/.test(String(res.headers["Retry-After"]))).toBeTruthy()
})

test("handler does not set Retry-After when resetTime missing", async () => {
  await import("../src/middleware/ipRateLimiter.js")
  const req = { ip: "1.2.3.4", originalUrl: "/api/auth/login", rateLimit: {} }
  const res = {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(k, v) {
      this.headers[k] = v
    },
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }

  const handler = capturedOptions.handler
  handler(req, res)

  expect(res.statusCode).toBe(429)
  expect(res.body).toEqual({ error: "Too many login attempts from this IP. Try again later." })
  expect(res.headers["Retry-After"]).toBeUndefined()
})
