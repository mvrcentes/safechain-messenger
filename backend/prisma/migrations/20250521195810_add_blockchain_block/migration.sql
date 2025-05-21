-- CreateTable
CREATE TABLE "BlockchainBlock" (
    "id" SERIAL NOT NULL,
    "previousHash" TEXT NOT NULL,
    "currentHash" TEXT NOT NULL,
    "messageId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockchainBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockchainBlock_currentHash_key" ON "BlockchainBlock"("currentHash");

-- CreateIndex
CREATE UNIQUE INDEX "BlockchainBlock_messageId_key" ON "BlockchainBlock"("messageId");

-- AddForeignKey
ALTER TABLE "BlockchainBlock" ADD CONSTRAINT "BlockchainBlock_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
