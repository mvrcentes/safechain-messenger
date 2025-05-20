

import crypto from "crypto"

/**
 * Encrypts a string using AES-256-GCM with a shared secret.
 * Returns base64 string: [12-byte IV][16-byte tag][ciphertext]
 * @param {string} plaintext
 * @param {string|Buffer} sharedSecret
 * @returns {string} base64-encoded result
 */
export function encryptAESGCM(plaintext, sharedSecret) {
  const key = crypto.createHash("sha256").update(sharedSecret).digest()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  // [IV][TAG][CIPHERTEXT]
  return Buffer.concat([iv, tag, encrypted]).toString("base64")
}

/**
 * Decrypts a base64 string (from encryptAESGCM) with a shared secret.
 * @param {string} encryptedBase64
 * @param {string|Buffer} sharedSecret
 * @returns {string} plaintext
 */
export function decryptAESGCM(encryptedBase64, sharedSecret) {
  const raw = Buffer.from(encryptedBase64, "base64")
  const iv = raw.slice(0, 12)
  const tag = raw.slice(12, 28)
  const encrypted = raw.slice(28)

  const key = crypto.createHash("sha256").update(sharedSecret).digest()
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString("utf8")
}