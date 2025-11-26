-- Add accessUntil column to Subscription table for cancel-at-period-end logic
-- This column tracks when PRO access should end after subscription cancellation

ALTER TABLE "Subscription"
ADD COLUMN IF NOT EXISTS "accessUntil" TIMESTAMP(3);

