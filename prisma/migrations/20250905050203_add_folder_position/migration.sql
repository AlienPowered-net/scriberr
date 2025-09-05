-- AlterTable
ALTER TABLE "Folder" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Update existing folders to have proper position values
UPDATE "Folder" SET "position" = (
  SELECT ROW_NUMBER() OVER (PARTITION BY "shopId" ORDER BY "createdAt" DESC) - 1
  FROM (SELECT "id", "shopId", "createdAt" FROM "Folder" f2 WHERE f2."id" = "Folder"."id") AS sub
);