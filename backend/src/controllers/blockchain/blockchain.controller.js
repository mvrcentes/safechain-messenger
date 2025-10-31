import prisma from "../../database.js"
import { calculateHash } from '../../utils/hash.js';
export async function createBlockchainEntry(messageId, messageContent) {
  const lastBlock = await prisma.blockchainBlock.findFirst({
    orderBy: { id: 'desc' },
  });

  const previousHash = lastBlock?.currentHash || 'GENESIS';
  const currentHash = calculateHash(messageContent, previousHash);

  console.log(" Nuevo bloque:", {
    messageId,
    previousHash,
    currentHash
  });

  const block = await prisma.blockchainBlock.create({
    data: {
      messageId,
      previousHash,
      currentHash,
    },
  });

  return block;
}