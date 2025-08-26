-- Add tags field to Note table
ALTER TABLE "public"."Note" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}';