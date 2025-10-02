-- CreateTable
CREATE TABLE "CustomMention" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomMention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomMention_shopId_idx" ON "CustomMention"("shopId");

-- AddForeignKey
ALTER TABLE "CustomMention" ADD CONSTRAINT "CustomMention_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
