import crypto from 'crypto';

export function calculateHash(messageContent, previousHash) {
  const data = messageContent + previousHash;
  return crypto.createHash('sha256').update(data).digest('hex');
}