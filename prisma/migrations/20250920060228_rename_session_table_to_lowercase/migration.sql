-- Rename Session table to session (lowercase) for Shopify session storage compatibility
ALTER TABLE "public"."Session" RENAME TO "session";