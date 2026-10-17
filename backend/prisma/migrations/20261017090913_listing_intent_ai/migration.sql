-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "exchangeCategory" TEXT,
ADD COLUMN     "exchangeOpenToAlternatives" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "exchangeWanted" TEXT;

-- CreateTable
CREATE TABLE "EmbeddingCache" (
    "key" TEXT NOT NULL,
    "modelKey" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "vector" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmbeddingCache_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmbeddingCache_modelKey_role_contentHash_key" ON "EmbeddingCache"("modelKey", "role", "contentHash");
