import { test, expect } from "vitest"
import { encryptAESGCM, decryptAESGCM } from "../src/lib/crypto.js"

test("encrypt + decrypt returns original text with string secret", () => {
  const secret = "my-shared-secret"
  const text = "Hello, 世界!"

  const encrypted = encryptAESGCM(text, secret)
  expect(typeof encrypted).toBe("string")

  const decrypted = decryptAESGCM(encrypted, secret)
  expect(decrypted).toBe(text)
})

test("encrypt + decrypt works with Buffer secret", () => {
  const secret = Buffer.from("buffer-secret")
  const text = "Another message"

  const encrypted = encryptAESGCM(text, secret)
  const decrypted = decryptAESGCM(encrypted, secret)
  expect(decrypted).toBe(text)
})

test("decrypt with wrong secret throws", () => {
  const secret = "correct-secret"
  const wrong = "wrong-secret"
  const text = "Sensitive"

  const encrypted = encryptAESGCM(text, secret)
  expect(() => decryptAESGCM(encrypted, wrong)).toThrow()
})

test("tampered ciphertext fails to decrypt", () => {
  const secret = "s"
  const text = "payload"
  const encrypted = encryptAESGCM(text, secret)

  // Tamper with the base64 payload by flipping one character in the ciphertext
  const raw = Buffer.from(encrypted, "base64")
  // flip a byte in the ciphertext region (after 28 bytes header)
  raw[28] = raw[28] ^ 0xff
  const tampered = raw.toString("base64")

  expect(() => decryptAESGCM(tampered, secret)).toThrow()
})
