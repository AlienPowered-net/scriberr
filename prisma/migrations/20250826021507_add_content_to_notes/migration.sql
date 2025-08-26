-- Add content column to Note table
ALTER TABLE "public"."Note" ADD COLUMN "content" TEXT NOT NULL DEFAULT '';