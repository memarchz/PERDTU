-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('DRAFT', 'AVAILABLE', 'RESERVED', 'EXCHANGED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'EXCHANGING', 'COMPLETED', 'DECLINED', 'EXPIRED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "imageUrl" TEXT,
    "area" TEXT NOT NULL DEFAULT 'Campus',
    "status" "ItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wish" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeParticipant" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "decision" "Decision" NOT NULL DEFAULT 'PENDING',
    "ready" BOOLEAN NOT NULL DEFAULT false,
    "received" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TradeParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeItem" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "TradeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeEvent" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Item_status_category_createdAt_idx" ON "Item"("status", "category", "createdAt");

-- CreateIndex
CREATE INDEX "Item_ownerId_status_idx" ON "Item"("ownerId", "status");

-- CreateIndex
CREATE INDEX "Wish_userId_idx" ON "Wish"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeParticipant_tradeId_userId_key" ON "TradeParticipant"("tradeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeItem_tradeId_itemId_key" ON "TradeItem"("tradeId", "itemId");

-- CreateIndex
CREATE INDEX "TradeEvent_tradeId_createdAt_idx" ON "TradeEvent"("tradeId", "createdAt");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wish" ADD CONSTRAINT "Wish_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeParticipant" ADD CONSTRAINT "TradeParticipant_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeParticipant" ADD CONSTRAINT "TradeParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeItem" ADD CONSTRAINT "TradeItem_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeItem" ADD CONSTRAINT "TradeItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeEvent" ADD CONSTRAINT "TradeEvent_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
