-- AlterTable
ALTER TABLE "public"."Session" ADD COLUMN     "accountOwner" BOOLEAN DEFAULT false,
ADD COLUMN     "collaborator" BOOLEAN DEFAULT false,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "emailVerified" BOOLEAN DEFAULT false,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "locale" TEXT,
ADD COLUMN     "userId" BIGINT;
