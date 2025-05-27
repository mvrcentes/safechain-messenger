import { jest } from "@jest/globals";
// ✅ Mock manual del módulo antes de importarlo
jest.unstable_mockModule("../src/utils/hash.js", () => ({
  calculateHash: jest.fn(),
}));

const prisma = await import("../src/database.js");
const hashUtils = await import("../src/utils/hash.js");
const { createBlockchainEntry } = await import("../src/controllers/blockchain/blockchain.controller.js");

describe("createBlockchainEntry", () => {
  beforeEach(() => {
    prisma.default.blockchainBlock = {
      findFirst: jest.fn(),
      create: jest.fn(),
    };
  });

  it("usa 'GENESIS' como previousHash si no hay bloques", async () => {
    prisma.default.blockchainBlock.findFirst.mockResolvedValue(null);
    prisma.default.blockchainBlock.create.mockResolvedValue({ id: 1 });

    hashUtils.calculateHash.mockReturnValue("fake-genesis-hash");

    await createBlockchainEntry(10, "mensaje");

    expect(prisma.default.blockchainBlock.findFirst).toHaveBeenCalled();
    expect(hashUtils.calculateHash).toHaveBeenCalledWith("mensaje", "GENESIS");
    expect(prisma.default.blockchainBlock.create).toHaveBeenCalledWith({
      data: {
        messageId: 10,
        previousHash: "GENESIS",
        currentHash: "fake-genesis-hash",
      },
    });
  });

  it("usa el hash del último bloque como previousHash", async () => {
    prisma.default.blockchainBlock.findFirst.mockResolvedValue({
      currentHash: "abc123",
    });
    prisma.default.blockchainBlock.create.mockResolvedValue({ id: 2 });

    hashUtils.calculateHash.mockReturnValue("next-hash");

    await createBlockchainEntry(11, "otro mensaje");

    expect(prisma.default.blockchainBlock.findFirst).toHaveBeenCalled();
    expect(prisma.default.blockchainBlock.create).toHaveBeenCalledWith({
      data: {
        messageId: 11,
        previousHash: "abc123",
        currentHash: "next-hash",
      },
    });
  });
});