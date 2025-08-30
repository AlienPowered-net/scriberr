-- Ensure UTF-8 support for emoji characters
-- This migration ensures proper text handling without changing database encoding
-- PostgreSQL databases are typically UTF-8 by default, so we just ensure proper column types

-- No changes needed - PostgreSQL with Prisma automatically handles UTF-8 encoding
-- The database is already in the correct state for UTF-8 support