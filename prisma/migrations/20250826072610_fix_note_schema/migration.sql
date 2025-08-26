-- Fix note schema: ensure content field exists and remove body field if it exists
-- First, check if body column exists and drop it if it does
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Note' AND column_name = 'body') THEN
        ALTER TABLE "public"."Note" DROP COLUMN "body";
    END IF;
END $$;

-- Ensure content column exists with proper type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Note' AND column_name = 'content') THEN
        ALTER TABLE "public"."Note" ADD COLUMN "content" TEXT NOT NULL DEFAULT '';
    END IF;
END $$;