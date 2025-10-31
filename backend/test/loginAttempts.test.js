import { test, expect, vi } from "vitest"

// We'll import the module freshly inside each test so the internal `attempts` Map is clean

test("recordFailedLoginAttempt increments and locks after threshold", async () => {
  vi.resetModules()
  const mod = await import("../src/middleware/loginAttempts.js")
  const { recordFailedLoginAttempt, isAccountLocked } = mod

  // freeze time
  const base = new Date("2025-01-01T00:00:00Z")
  vi.setSystemTime(base)

  const email = "a@example.com"
  // call 4 times -> not locked yet
  for (let i = 1; i < 5; i++) {
    const entry = recordFailedLoginAttempt(email)
    expect(entry.count).toBe(i)
  }

  // 5th call -> should lock
  const entry = recordFailedLoginAttempt(email)
  expect(entry.count).toBe(5)
  expect(entry.lockedUntil).toBeDefined()
  // isAccountLocked should be true now
  expect(isAccountLocked(email)).toBe(true)

  vi.useRealTimers()
})

test("isAccountLocked expires lock after LOCK_TIME_MS and cleans up", async () => {
  vi.resetModules()
  const mod = await import("../src/middleware/loginAttempts.js")
  const { recordFailedLoginAttempt, isAccountLocked } = mod

  const base = new Date("2025-01-01T00:00:00Z")
  vi.setSystemTime(base)

  const email = "b@example.com"
  // lock it
  for (let i = 0; i < 5; i++) recordFailedLoginAttempt(email)

  // still locked at base
  expect(isAccountLocked(email)).toBe(true)

  // advance time beyond lock period (15 minutes + 1s)
  const later = new Date(base.getTime() + 15 * 60 * 1000 + 1000)
  vi.setSystemTime(later)

  // now should not be locked and internal entry cleaned
  expect(isAccountLocked(email)).toBe(false)

  vi.useRealTimers()
})

test("resetFailedLoginAttempts clears attempts", async () => {
  vi.resetModules()
  const mod = await import("../src/middleware/loginAttempts.js")
  const { recordFailedLoginAttempt, isAccountLocked, resetFailedLoginAttempts } = mod

  const email = "c@example.com"
  recordFailedLoginAttempt(email)
  expect(isAccountLocked(email)).toBe(false)

  await resetFailedLoginAttempts(email)
  // after reset, no entry -> not locked and count resets if recorded again
  expect(isAccountLocked(email)).toBe(false)

  const entry = recordFailedLoginAttempt(email)
  expect(entry.count).toBe(1)
})

test("accountLockMiddleware passes through when no email", async () => {
  vi.resetModules()
  const mod = await import("../src/middleware/loginAttempts.js")
  const { accountLockMiddleware } = mod

  const req = { body: {} }
  const res = { status: () => ({ json: () => {} }) }
  const next = vi.fn()

  accountLockMiddleware(req, res, next)
  expect(next).toHaveBeenCalled()
})

test("accountLockMiddleware blocks locked account with 429", async () => {
  vi.resetModules()
  const mod = await import("../src/middleware/loginAttempts.js")
  const { recordFailedLoginAttempt, accountLockMiddleware } = mod

  const email = "d@example.com"
  // lock the account
  for (let i = 0; i < 5; i++) recordFailedLoginAttempt(email)

  const req = { body: { email } }
  const res = {
    status(code) {
      this._status = code
      return this
    },
    json(payload) {
      this._body = payload
      return this
    },
  }
  const next = vi.fn()

  accountLockMiddleware(req, res, next)

  expect(res._status).toBe(429)
  expect(res._body).toEqual({ error: "Account temporarily locked due to multiple failed login attempts. Try later." })
  expect(next).not.toHaveBeenCalled()
})
