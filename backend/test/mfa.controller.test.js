import { beforeEach, describe, expect, test, vi } from "vitest"
import express from "express"
import request from "supertest"

// --- Mocks de dependencias ---
vi.mock("chalk", () => ({
  default: {
    red: vi.fn((x) => x),
    green: vi.fn((x) => x),
    yellow: vi.fn((x) => x),
  },
}))

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qrcode"),
  },
  toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qrcode"),
}))

vi.mock("speakeasy", () => ({
  default: {
    generateSecret: vi.fn(() => ({
      base32: "BASE32SECRET",
      otpauth_url: "otpauth://totp/SafeChain?secret=BASE32SECRET",
    })),
    totp: { verify: vi.fn() },
  },
  generateSecret: vi.fn(() => ({
    base32: "BASE32SECRET",
    otpauth_url: "otpauth://totp/SafeChain?secret=BASE32SECRET",
  })),
  totp: { verify: vi.fn() },
}))

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn(),
  },
  verify: vi.fn(),
}))

vi.mock("../../src/database.js", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// --- Imports reales después de mocks ---
import prisma from "../../src/database.js"
import jwt from "jsonwebtoken"
import speakeasy from "speakeasy"
import qrcode from "qrcode"
import {
  getMFAStatus,
  setupMFA,
  verifyAndEnableMFA,
  disableMFA,
} from "../../src/mfa/mfa.controller.js"

// --- App auxiliar ---
function createApp() {
  const app = express()
  app.use(express.json())
  app.get("/mfa/status", getMFAStatus)
  app.post("/mfa/setup", setupMFA)
  app.post("/mfa/verify", verifyAndEnableMFA)
  app.post("/mfa/disable", disableMFA)
  return app
}

let app
beforeEach(() => {
  app = createApp()
  vi.clearAllMocks()
  process.env.JWT_SECRET = "secret"
})

// --- TESTS ---

describe("MFA Controller", () => {
  test("getMFAStatus → 401 si token faltante o inválido", async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error("invalid")
    })

    const res = await request(app).get("/mfa/status")
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: "Invalid or missing token" })
  })

  test("getMFAStatus → 200 si MFA habilitado", async () => {
    jwt.verify.mockReturnValue({ email: "user@mail.com" })
    prisma.user.findUnique.mockResolvedValueOnce({ mfaSecret: "XYZ" })

    const res = await request(app)
      .get("/mfa/status")
      .set("Authorization", "Bearer token")

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ mfaEnabled: true })
  })

  test("getMFAStatus → 500 si la base de datos falla", async () => {
    jwt.verify.mockReturnValue({ email: "user@mail.com" })
    prisma.user.findUnique.mockRejectedValueOnce(new Error("DB error"))

    const res = await request(app)
      .get("/mfa/status")
      .set("Authorization", "Bearer token")

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: "Failed to get MFA status" })
  })

  test("setupMFA → 200 devuelve secret y QR", async () => {
    jwt.verify.mockReturnValue({ email: "user@mail.com" })
    const res = await request(app)
      .post("/mfa/setup")
      .set("Authorization", "Bearer token")

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("secret", "BASE32SECRET")
    expect(res.body).toHaveProperty("qrCode")
  })

  test("setupMFA → 500 si falla QR", async () => {
    jwt.verify.mockReturnValue({ email: "user@mail.com" })
    qrcode.toDataURL.mockRejectedValueOnce(new Error("QR error"))

    const res = await request(app)
      .post("/mfa/setup")
      .set("Authorization", "Bearer token")

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: "Failed to generate MFA QR" })
  })

  test("verifyAndEnableMFA → 400 si faltan campos", async () => {
    jwt.verify.mockReturnValue({ email: "user@mail.com" })
    const res = await request(app)
      .post("/mfa/verify")
      .set("Authorization", "Bearer token")
      .send({})

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: "Missing fields" })
  })

  test("verifyAndEnableMFA → 401 si código inválido", async () => {
    jwt.verify.mockReturnValue({ email: "user@mail.com" })
    speakeasy.totp.verify.mockReturnValueOnce(false)

    const res = await request(app)
      .post("/mfa/verify")
      .set("Authorization", "Bearer token")
      .send({ token: "123456", secret: "BASE32" })

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: "Invalid MFA code" })
  })

  test("verifyAndEnableMFA → 200 cuando todo es válido", async () => {
    jwt.verify.mockReturnValue({ email: "user@mail.com" })
    speakeasy.totp.verify.mockReturnValueOnce(true)
    prisma.user.update.mockResolvedValueOnce({})

    const res = await request(app)
      .post("/mfa/verify")
      .set("Authorization", "Bearer token")
      .send({ token: "123456", secret: "BASE32" })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ message: "MFA enabled successfully" })
  })

  test("verifyAndEnableMFA → 500 si falla update", async () => {
    jwt.verify.mockReturnValue({ email: "user@mail.com" })
    speakeasy.totp.verify.mockReturnValueOnce(true)
    prisma.user.update.mockRejectedValueOnce(new Error("DB error"))

    const res = await request(app)
      .post("/mfa/verify")
      .set("Authorization", "Bearer token")
      .send({ token: "123456", secret: "BASE32" })

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: "Failed to enable MFA" })
  })

  test("disableMFA → 401 si token inválido", async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error("invalid")
    })
    const res = await request(app).post("/mfa/disable")
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: "Invalid or missing token" })
  })

  test("disableMFA → 200 cuando se deshabilita correctamente", async () => {
    jwt.verify.mockReturnValue({ email: "user@mail.com" })
    prisma.user.update.mockResolvedValueOnce({})

    const res = await request(app)
      .post("/mfa/disable")
      .set("Authorization", "Bearer token")

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ message: "MFA disabled successfully" })
  })

  test("disableMFA → 500 si falla update", async () => {
    jwt.verify.mockReturnValue({ email: "user@mail.com" })
    prisma.user.update.mockRejectedValueOnce(new Error("DB error"))

    const res = await request(app)
      .post("/mfa/disable")
      .set("Authorization", "Bearer token")

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: "Failed to disable MFA" })
  })
})
