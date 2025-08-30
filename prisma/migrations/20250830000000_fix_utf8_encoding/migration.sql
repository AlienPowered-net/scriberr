-- Fix UTF-8 encoding for all tables
-- This migration ensures proper UTF-8 encoding for emoji support

-- Set the database to use UTF-8 encoding
ALTER DATABASE "neondb" SET client_encoding TO 'UTF8';

-- Convert all text columns to use UTF-8 encoding
ALTER TABLE "public"."Note" ALTER COLUMN "title" TYPE text COLLATE "default";
ALTER TABLE "public"."Note" ALTER COLUMN "content" TYPE text COLLATE "default";
ALTER TABLE "public"."Note" ALTER COLUMN "tags" TYPE text[] COLLATE "default";

ALTER TABLE "public"."Folder" ALTER COLUMN "name" TYPE text COLLATE "default";

ALTER TABLE "public"."Shop" ALTER COLUMN "domain" TYPE text COLLATE "default";

-- Set the schema to use UTF-8
ALTER SCHEMA "public" SET client_encoding TO 'UTF8';