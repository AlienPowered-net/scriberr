-- Create enums for plan and subscription status
DO $$ BEGIN
  CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('NONE', 'ACTIVE', 'CANCELED', 'PAST_DUE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Extend shops with plan & metadata columns
ALTER TABLE "Shop"
  ADD COLUMN IF NOT EXISTS "shopGid" TEXT,
  ADD COLUMN IF NOT EXISTS "plan" "Plan" NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Ensure updatedAt stays current
CREATE OR REPLACE FUNCTION set_shop_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shop_set_updated_at ON "Shop";
CREATE TRIGGER shop_set_updated_at
BEFORE UPDATE ON "Shop"
FOR EACH ROW
EXECUTE FUNCTION set_shop_updated_at();

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" TEXT PRIMARY KEY,
  "shopId" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'NONE',
  "shopifySubGid" TEXT,
  "name" TEXT,
  "priceAmount" DECIMAL(10, 2),
  "currency" TEXT,
  "testMode" BOOLEAN NOT NULL DEFAULT TRUE,
  "trialEndsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Subscription_shopId_key" UNIQUE ("shopId"),
  CONSTRAINT "Subscription_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Trigger to maintain updatedAt on subscriptions
CREATE OR REPLACE FUNCTION set_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscription_set_updated_at ON "Subscription";
CREATE TRIGGER subscription_set_updated_at
BEFORE UPDATE ON "Subscription"
FOR EACH ROW
EXECUTE FUNCTION set_subscription_updated_at();

