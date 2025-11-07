-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('FREE', 'BASIC', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'TRIAL', 'GRACE', 'CANCELLED', 'PAST_DUE');

-- AlterTable
ALTER TABLE "public"."Shop"
    ADD COLUMN "plan" "PlanCode" NOT NULL DEFAULT 'FREE',
    ADD COLUMN "planStatus" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN "planManaged" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "planActivatedAt" TIMESTAMP(3),
    ADD COLUMN "planTrialEndsAt" TIMESTAMP(3),
    ADD COLUMN "planGraceEndsAt" TIMESTAMP(3),
    ADD COLUMN "planRenewsAt" TIMESTAMP(3),
    ADD COLUMN "billingSubscriptionId" TEXT,
    ADD COLUMN "billingSubscriptionLineItemId" TEXT,
    ADD COLUMN "billingManagedAt" TIMESTAMP(3),
    ADD COLUMN "billingCancelledAt" TIMESTAMP(3),
    ADD COLUMN "billingLastSyncAt" TIMESTAMP(3),
    ADD COLUMN "billingLastSyncError" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Shop_billingSubscriptionId_key" ON "public"."Shop"("billingSubscriptionId");
