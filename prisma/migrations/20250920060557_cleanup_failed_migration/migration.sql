-- Cleanup migration to handle failed migration state
-- This migration ensures the session table exists with the correct name

-- Check if Session table exists and rename it to session if needed
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
            RAISE NOTICE 'Dropped duplicate Session table';
        END IF;
    END IF;
    
    -- Ensure session table has all required columns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session' AND table_schema = 'public') THEN
        -- Add any missing columns that might be needed
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session' AND column_name = 'userId' AND table_schema = 'public') THEN
            ALTER TABLE "public"."session" ADD COLUMN "userId" BIGINT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session' AND column_name = 'firstName' AND table_schema = 'public') THEN
            ALTER TABLE "public"."session" ADD COLUMN "firstName" TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session' AND column_name = 'lastName' AND table_schema = 'public') THEN
            ALTER TABLE "public"."session" ADD COLUMN "lastName" TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session' AND column_name = 'email' AND table_schema = 'public') THEN
            ALTER TABLE "public"."session" ADD COLUMN "email" TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session' AND column_name = 'accountOwner' AND table_schema = 'public') THEN
            ALTER TABLE "public"."session" ADD COLUMN "accountOwner" BOOLEAN DEFAULT false;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session' AND column_name = 'locale' AND table_schema = 'public') THEN
            ALTER TABLE "public"."session" ADD COLUMN "locale" TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session' AND column_name = 'collaborator' AND table_schema = 'public') THEN
            ALTER TABLE "public"."session" ADD COLUMN "collaborator" BOOLEAN DEFAULT false;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session' AND column_name = 'emailVerified' AND table_schema = 'public') THEN
            ALTER TABLE "public"."session" ADD COLUMN "emailVerified" BOOLEAN DEFAULT false;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session' AND column_name = 'onlineAccessInfo' AND table_schema = 'public') THEN
            ALTER TABLE "public"."session" ADD COLUMN "onlineAccessInfo" JSONB;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session' AND column_name = 'createdAt' AND table_schema = 'public') THEN
            ALTER TABLE "public"."session" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session' AND column_name = 'updatedAt' AND table_schema = 'public') THEN
            ALTER TABLE "public"."session" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
        END IF;
        
        RAISE NOTICE 'Ensured session table has all required columns';
    END IF;
END $$;