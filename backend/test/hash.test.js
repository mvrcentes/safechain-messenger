import { describe, it, expect } from "vitest"
import { calculateHash } from "../src/utils/hash.js"

describe("calculateHash", () => {
  it("returns a 64-char hex SHA-256 for given inputs", () => {
    const h = calculateHash("hello", "prev")
    expect(typeof h).toBe("string")
    expect(h).toMatch(/^[0-9a-f]{64}$/)
  })

  it("is deterministic for same inputs", () => {
    const a = calculateHash("msg", "p")
    const b = calculateHash("msg", "p")
    expect(a).toBe(b)
  })

  it("differs when previousHash changes", () => {
    const a = calculateHash("msg", "p1")
    const b = calculateHash("msg", "p2")
    expect(a).not.toBe(b)
  })

  it("handles empty strings", () => {
    const a = calculateHash("", "")
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it("throws when inputs are non-strings (crypto requires string or Buffer)", () => {
    expect(() => calculateHash(123, 456)).toThrow(TypeError)
  })
})
