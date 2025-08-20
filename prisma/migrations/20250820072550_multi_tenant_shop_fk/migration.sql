/*
  Warnings:

  - A unique constraint covering the columns `[shopId,name]` on the table `Folder` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."Folder" DROP CONSTRAINT "Folder_shopId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Note" DROP CONSTRAINT "Note_shopId_fkey";

-- DropIndex
DROP INDEX "public"."Folder_shopId_name_idx";

-- AlterTable
ALTER TABLE "public"."Shop" ADD COLUMN     "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Folder_shopId_idx" ON "public"."Folder"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "Folder_shopId_name_key" ON "public"."Folder"("shopId", "name");

-- AddForeignKey
ALTER TABLE "public"."Folder" ADD CONSTRAINT "Folder_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "public"."Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Note" ADD CONSTRAINT "Note_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "public"."Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
