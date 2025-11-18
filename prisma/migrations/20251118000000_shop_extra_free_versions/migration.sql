-- AlterTable
ALTER TABLE "Shop"
ADD COLUMN     "extraFreeVersions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "versionLimitPromptedAt" TIMESTAMP(3);

