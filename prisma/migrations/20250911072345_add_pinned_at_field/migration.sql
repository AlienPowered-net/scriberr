-- AlterTable
-- Check if pinnedAt column exists before adding it (idempotent migration)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Note' 
        AND column_name = 'pinnedAt' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "Note" ADD COLUMN "pinnedAt" TIMESTAMP(3);
        RAISE NOTICE 'Added pinnedAt column to Note table';
    ELSE
        RAISE NOTICE 'pinnedAt column already exists in Note table';
    END IF;
END $$;