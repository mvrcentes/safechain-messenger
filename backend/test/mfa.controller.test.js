import { test, expect, vi, beforeEach } from "vitest"

// Mocks: deben declararse antes de importar el controlador
vi.mock("../src/database.js", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qrdata"),
  },
}))

vi.mock("speakeasy", () => ({
  default: {
    generateSecret: vi.fn().mockReturnValue({ base32: "BASE32SECRET", otpauth_url: "otpauth://totp/SafeChain" }),
    totp: {
      verify: vi.fn(),
    },
  },
}))

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn().mockReturnValue({ email: "test@example.com" }),
  },
}))

// Evita logs ruidosos
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

import prisma from "../src/database.js"
import qrcode from "qrcode"
import speakeasy from "speakeasy"
import jwt from "jsonwebtoken"

import {
  getMFAStatus,
  setupMFA,
  verifyAndEnableMFA,
  disableMFA,
} from "../src/controllers/auth/mfa.controller.js"

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

test("getMFAStatus responde 401 sin token", async () => {
  const req = { headers: {} }
  const res = createRes()

  await getMFAStatus(req, res)

  expect(res.statusCode).toBe(401)
  expect(res.body).toEqual({ error: "Invalid or missing token" })
})

test("getMFAStatus responde mfaEnabled true cuando hay secret en DB", async () => {
  const req = { headers: { authorization: "Bearer validtoken" } }
  prisma.user.findUnique.mockResolvedValue({ mfaSecret: "ABC" })
  const res = createRes()

  await getMFAStatus(req, res)

  expect(res.statusCode).toBe(200)
  expect(res.body).toEqual({ mfaEnabled: true })
  expect(prisma.user.findUnique).toHaveBeenCalled()
})

test("setupMFA devuelve secret y qrCode cuando token válido", async () => {
  const req = { headers: { authorization: "Bearer validtoken" } }
  const res = createRes()

  await setupMFA(req, res)

  expect(res.statusCode).toBe(200)
  expect(res.body).toHaveProperty("secret", "BASE32SECRET")
  expect(res.body).toHaveProperty("qrCode", "data:image/png;base64,qrdata")
  expect(qrcode.toDataURL).toHaveBeenCalled()
})

test("verifyAndEnableMFA devuelve 400 cuando faltan campos", async () => {
  const req = { headers: { authorization: "Bearer validtoken" }, body: {} }
  const res = createRes()

  await verifyAndEnableMFA(req, res)

  expect(res.statusCode).toBe(400)
  expect(res.body).toEqual({ error: "Missing fields" })
})

test("verifyAndEnableMFA devuelve 401 si el código es inválido", async () => {
  const req = {
    headers: { authorization: "Bearer validtoken" },
    body: { token: "123456", secret: "BASE32SECRET" },
  }
  const res = createRes()
  speakeasy.totp.verify.mockReturnValue(false)

  await verifyAndEnableMFA(req, res)

  expect(res.statusCode).toBe(401)
  expect(res.body).toEqual({ error: "Invalid MFA code" })
})

test("verifyAndEnableMFA habilita MFA cuando el código es válido", async () => {
  const req = {
    headers: { authorization: "Bearer validtoken" },
    body: { token: "123456", secret: "BASE32SECRET" },
  }
  const res = createRes()
  speakeasy.totp.verify.mockReturnValue(true)
  prisma.user.update.mockResolvedValue({})

  await verifyAndEnableMFA(req, res)

  expect(res.statusCode).toBe(200)
  expect(res.body).toEqual({ message: "MFA enabled successfully" })
  expect(prisma.user.update).toHaveBeenCalledWith({ where: { email: "test@example.com" }, data: { mfaSecret: "BASE32SECRET" } })
})

test("disableMFA devuelve 401 si token inválido", async () => {
  const req = { headers: {} }
  const res = createRes()

  await disableMFA(req, res)

  expect(res.statusCode).toBe(401)
  expect(res.body).toEqual({ error: "Invalid or missing token" })
})

test("disableMFA deshabilita MFA cuando token válido", async () => {
  const req = { headers: { authorization: "Bearer validtoken" } }
  const res = createRes()
  prisma.user.update.mockResolvedValue({})

  await disableMFA(req, res)

  expect(res.statusCode).toBe(200)
  expect(res.body).toEqual({ message: "MFA disabled successfully" })
  expect(prisma.user.update).toHaveBeenCalledWith({ where: { email: "test@example.com" }, data: { mfaSecret: null } })
})
