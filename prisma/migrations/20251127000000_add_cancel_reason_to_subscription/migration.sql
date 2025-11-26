-- Add cancelReason column to Subscription table for tracking why users cancel
-- This helps with analytics and improving the product

ALTER TABLE "Subscription"
ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;

