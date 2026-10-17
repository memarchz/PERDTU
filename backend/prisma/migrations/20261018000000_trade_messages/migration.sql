CREATE TABLE "TradeMessage" (
  "id" TEXT NOT NULL,
  "tradeId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "clientMessageId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TradeMessage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TradeMessage_tradeId_senderId_clientMessageId_key" ON "TradeMessage"("tradeId", "senderId", "clientMessageId");
CREATE INDEX "TradeMessage_tradeId_createdAt_id_idx" ON "TradeMessage"("tradeId", "createdAt", "id");
ALTER TABLE "TradeMessage" ADD CONSTRAINT "TradeMessage_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TradeMessage" ADD CONSTRAINT "TradeMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
