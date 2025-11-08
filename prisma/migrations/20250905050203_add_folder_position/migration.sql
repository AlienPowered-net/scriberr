-- WARNING: This migration has already been applied manually in production.
-- If deploying to an existing Neon DB, mark it as applied via
--   prisma migrate resolve --applied 20250905050203_add_folder_position
-- before running prisma migrate deploy.

-- AlterTable
ALTER TABLE "Folder" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Update existing folders to have proper position values
UPDATE "Folder" SET "position" = (
  SELECT ROW_NUMBER() OVER (PARTITION BY "shopId" ORDER BY "createdAt" DESC) - 1
  FROM (SELECT "id", "shopId", "createdAt" FROM "Folder" f2 WHERE f2."id" = "Folder"."id") AS sub
);