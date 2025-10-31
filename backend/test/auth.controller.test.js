import { test, expect, vi, beforeEach } from "vitest"

// Mocks (must be defined before importing the controller)
vi.mock("../src/database.js", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

vi.mock("argon2", () => ({
  default: {
    verify: vi.fn(),
    hash: vi.fn().mockResolvedValue("hashedPassword"),
  },
}))

vi.mock("chalk", () => ({
  default: {
    blue: (t) => t,
    green: (t) => t,
    red: (t) => t,
    yellow: (t) => t,
    magenta: (t) => t,
    gray: (t) => t,
  },
}))

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn().mockReturnValue("access-token"),
  },
}))

vi.mock("speakeasy", () => ({
  default: {
    totp: { verify: vi.fn() },
  },
}))

vi.mock("uuid", () => ({
  v4: () => "refresh-token-uuid",
}))

vi.mock("cookie", () => ({
  serialize: vi.fn().mockReturnValue("refreshToken=refresh-token-uuid; Path=/"),
}))

vi.mock("dayjs", () => ({
  default: () => ({ add: () => ({ toDate: () => new Date() }) }),
}))

vi.mock("../src/middleware/loginAttempts.js", () => ({
  recordFailedLoginAttempt: vi.fn(),
  resetFailedLoginAttempts: vi.fn(),
}))

import prisma from "../src/database.js"
import argon2 from "argon2"
import jwt from "jsonwebtoken"
import speakeasy from "speakeasy"
import { recordFailedLoginAttempt, resetFailedLoginAttempts } from "../src/middleware/loginAttempts.js"

import {
  logout,
  login,
  loginWithMFA,
  refreshToken,
} from "../src/controllers/auth/auth.controller.js"

function createRes() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
    setHeader(k, v) {
      this.headers[k] = v
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

test("logout sin token devuelve 200 y mensaje", async () => {
  const req = { cookies: {} }
  const res = createRes()

  await logout(req, res)

  expect(res.statusCode).toBe(200)
  expect(res.body).toEqual({ message: "No session to clear" })
  expect(prisma.session.deleteMany).not.toHaveBeenCalled()
})

test("logout con token elimina sesión y limpia cookie", async () => {
  const req = { cookies: { refreshToken: "rtoken" } }
  const res = createRes()
  prisma.session.deleteMany.mockResolvedValue({ count: 1 })

  await logout(req, res)

  expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { token: "rtoken" } })
  expect(res.headers["Set-Cookie"]).toContain("refreshToken=")
  expect(res.statusCode).toBe(200)
  expect(res.body).toEqual({ message: "Logged out" })
})

test("login valida longitud mínima de password", async () => {
  const req = { body: { email: "a@b.com", password: "short" } }
  const res = createRes()

  await login(req, res)

  expect(res.statusCode).toBe(400)
  expect(res.body).toEqual({ error: "Password must be at least 8 characters" })
})

test("login user no encontrado -> 401 y registra intento fallido", async () => {
  const req = { body: { email: "no@user.com", password: "validpass" } }
  const res = createRes()
  prisma.user.findUnique.mockResolvedValue(null)

  await login(req, res)

  expect(res.statusCode).toBe(401)
  expect(recordFailedLoginAttempt).toHaveBeenCalledWith("no@user.com")
})

test("login password inválida -> 401 y registra intento fallido", async () => {
  const req = { body: { email: "u@b.com", password: "validpass" } }
  const res = createRes()
  prisma.user.findUnique.mockResolvedValue({ id: 1, email: "u@b.com", passwordHash: "hash" })
  argon2.verify.mockResolvedValue(false)

  await login(req, res)

  expect(res.statusCode).toBe(401)
  expect(recordFailedLoginAttempt).toHaveBeenCalledWith("u@b.com")
})

test("login solicita MFA -> 206", async () => {
  const req = { body: { email: "u@b.com", password: "validpass" } }
  const res = createRes()
  prisma.user.findUnique.mockResolvedValue({ id: 1, email: "u@b.com", passwordHash: "hash", mfaSecret: "s" })
  argon2.verify.mockResolvedValue(true)

  await login(req, res)

  expect(res.statusCode).toBe(206)
  expect(res.body).toEqual({ message: "MFA required", mfaRequired: true })
})

test("login exitoso crea sesión, retorna token y limpia intentos fallidos", async () => {
  const req = { body: { email: "u@b.com", password: "validpass" } }
  const res = createRes()
  const user = { id: 1, email: "u@b.com", passwordHash: "hash", mfaSecret: null }
  prisma.user.findUnique.mockResolvedValue(user)
  argon2.verify.mockResolvedValue(true)
  prisma.session.create.mockResolvedValue({ token: "refresh-token-uuid" })

  await login(req, res)

  expect(prisma.session.create).toHaveBeenCalled()
  expect(resetFailedLoginAttempts).toHaveBeenCalledWith("u@b.com")
  expect(res.body).toHaveProperty("token", "access-token")
  expect(res.headers["Set-Cookie"]).toBeDefined()
})

// loginWithMFA
test("loginWithMFA missing fields -> 400", async () => {
  const req = { body: {} }
  const res = createRes()

  await loginWithMFA(req, res)

  expect(res.statusCode).toBe(400)
})

test("loginWithMFA mfa no activa -> 403", async () => {
  const req = { body: { email: "x@x.com", token: "123" } }
  const res = createRes()
  prisma.user.findUnique.mockResolvedValue({})

  await loginWithMFA(req, res)

  expect(res.statusCode).toBe(403)
})

test("loginWithMFA codigo inválido -> 401", async () => {
  const req = { body: { email: "x@x.com", token: "123" } }
  const res = createRes()
  prisma.user.findUnique.mockResolvedValue({ mfaSecret: "s", id: 1, email: "x@x.com" })
  speakeasy.totp.verify.mockReturnValue(false)

  await loginWithMFA(req, res)

  expect(res.statusCode).toBe(401)
})

test("loginWithMFA exitoso -> crea sesión y retorna token", async () => {
  const req = { body: { email: "x@x.com", token: "123" } }
  const res = createRes()
  prisma.user.findUnique.mockResolvedValue({ mfaSecret: "s", id: 1, email: "x@x.com" })
  speakeasy.totp.verify.mockReturnValue(true)
  prisma.session.create.mockResolvedValue({ token: "refresh-token-uuid" })

  await loginWithMFA(req, res)

  expect(prisma.session.create).toHaveBeenCalled()
  expect(res.body).toHaveProperty("token", "access-token")
  expect(res.headers["Set-Cookie"]).toBeDefined()
})

// refreshToken
test("refreshToken sin cookie -> 401", async () => {
  const req = { cookies: {} }
  const res = createRes()

  await refreshToken(req, res)

  expect(res.statusCode).toBe(401)
})

test("refreshToken sesión inválida -> 403", async () => {
  const req = { cookies: { refreshToken: "rt" } }
  const res = createRes()
  prisma.session.findUnique.mockResolvedValue(null)

  await refreshToken(req, res)

  expect(res.statusCode).toBe(403)
})

test("refreshToken usuario no encontrado -> 403", async () => {
  const req = { cookies: { refreshToken: "rt" } }
  const res = createRes()
  prisma.session.findUnique.mockResolvedValue({ userId: 10, expiresAt: new Date(Date.now() + 10000) })
  prisma.user.findUnique.mockResolvedValue(null)

  await refreshToken(req, res)

  expect(res.statusCode).toBe(403)
})

test("refreshToken exitoso -> devuelve nuevo token", async () => {
  const req = { cookies: { refreshToken: "rt" } }
  const res = createRes()
  prisma.session.findUnique.mockResolvedValue({ userId: 1, expiresAt: new Date(Date.now() + 10000) })
  prisma.user.findUnique.mockResolvedValue({ id: 1, email: "u@b.com" })

  await refreshToken(req, res)

  expect(res.body).toHaveProperty("token", "access-token")
})
