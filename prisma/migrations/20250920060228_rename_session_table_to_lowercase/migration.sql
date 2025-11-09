-- NO-OP PLACEHOLDER / Idempotent migration
-- Rename Session table to session (lowercase) for Shopify session storage compatibility
-- This migration handles the case where Session table may not exist (already renamed or never existed)
DO $$
BEGIN
    -- Check if Session table exists (uppercase)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Session' AND table_schema = 'public') THEN
        -- Check if session table already exists (lowercase)
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session' AND table_schema = 'public') THEN
            -- Rename Session to session
            ALTER TABLE "public"."Session" RENAME TO "session";
            RAISE NOTICE 'Renamed Session table to session';
        ELSE
            -- Both tables exist, drop the uppercase one
            DROP TABLE "public"."Session";
            RAISE NOTICE 'Dropped duplicate Session table (session already exists)';
        END IF;
    ELSE
        -- Session table doesn't exist - migration already applied or not applicable
        RAISE NOTICE 'Session table does not exist - migration already applied or not applicable';
    END IF;
END $$;