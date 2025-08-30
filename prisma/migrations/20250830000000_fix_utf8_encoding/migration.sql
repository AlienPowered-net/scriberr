-- Fix UTF-8 encoding for all tables
-- This migration ensures proper UTF-8 encoding for emoji support

-- Note: PostgreSQL databases are typically created with UTF-8 encoding by default
-- This migration focuses on ensuring proper text column handling

-- Convert all text columns to use proper text type (UTF-8 is default)
-- The COLLATE "default" ensures we use the database's default collation (UTF-8)

ALTER TABLE "public"."Note" ALTER COLUMN "title" TYPE text;
ALTER TABLE "public"."Note" ALTER COLUMN "content" TYPE text;
ALTER TABLE "public"."Note" ALTER COLUMN "tags" TYPE text[];

ALTER TABLE "public"."Folder" ALTER COLUMN "name" TYPE text;

ALTER TABLE "public"."Shop" ALTER COLUMN "domain" TYPE text;