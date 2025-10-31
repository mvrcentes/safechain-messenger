import { test, expect, vi, beforeEach } from "vitest"

// Mock prisma and hash util before importing the controller
vi.mock("../src/database.js", () => ({
  default: {
    blockchainBlock: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock("../src/utils/hash.js", () => ({
  calculateHash: vi.fn(),
}))

import prisma from "../src/database.js"
import { calculateHash } from "../src/utils/hash.js"
import { createBlockchainEntry } from "../src/controllers/blockchain/blockchain.controller.js"

beforeEach(() => vi.clearAllMocks())

test("creates genesis block when no previous block exists", async () => {
  prisma.blockchainBlock.findFirst.mockResolvedValue(null)
  calculateHash.mockReturnValue("abc123")
  const created = { id: 1, messageId: 5, previousHash: "GENESIS", currentHash: "abc123" }
  prisma.blockchainBlock.create.mockResolvedValue(created)

  const res = await createBlockchainEntry(5, "hello")

  expect(prisma.blockchainBlock.findFirst).toHaveBeenCalled()
  expect(calculateHash).toHaveBeenCalledWith("hello", "GENESIS")
  expect(prisma.blockchainBlock.create).toHaveBeenCalledWith({ data: { messageId: 5, previousHash: "GENESIS", currentHash: "abc123" } })
  expect(res).toEqual(created)
})

test("creates block when previous block exists", async () => {
  prisma.blockchainBlock.findFirst.mockResolvedValue({ currentHash: "prevhash" })
  calculateHash.mockReturnValue("newhash")
  const created = { id: 2, messageId: 6, previousHash: "prevhash", currentHash: "newhash" }
  prisma.blockchainBlock.create.mockResolvedValue(created)

  const res = await createBlockchainEntry(6, "world")

  expect(calculateHash).toHaveBeenCalledWith("world", "prevhash")
  expect(prisma.blockchainBlock.create).toHaveBeenCalledWith({ data: { messageId: 6, previousHash: "prevhash", currentHash: "newhash" } })
  expect(res).toEqual(created)
})

test("propagates error when create fails", async () => {
  prisma.blockchainBlock.findFirst.mockResolvedValue(null)
  calculateHash.mockReturnValue("x")
  prisma.blockchainBlock.create.mockRejectedValue(new Error("db fail"))

  await expect(createBlockchainEntry(7, "!" )).rejects.toThrow("db fail")
})
