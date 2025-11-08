-- Create enum for version save type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'VersionSaveType'
  ) THEN
    CREATE TYPE "VersionSaveType" AS ENUM ('AUTO', 'MANUAL');
  END IF;
END
$$;

-- Add new columns with defaults
ALTER TABLE "NoteVersion"
  ADD COLUMN IF NOT EXISTS "saveType" "VersionSaveType" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "freeVisible" BOOLEAN NOT NULL DEFAULT true;

-- Backfill saveType from legacy isAuto flag or known pathways
UPDATE "NoteVersion"
SET "saveType" = CASE
  WHEN "isAuto" = true THEN 'AUTO'
  ELSE 'MANUAL'
END;

-- Default visibility handling for PRO shops
UPDATE "NoteVersion" nv
SET "freeVisible" = true
FROM "Note" n
JOIN "Shop" s ON s."id" = n."shopId"
WHERE nv."noteId" = n."id"
  AND s."plan" = 'PRO';

-- Reset visibility for FREE shops prior to recomputation
UPDATE "NoteVersion" nv
SET "freeVisible" = false
FROM "Note" n
JOIN "Shop" s ON s."id" = n."shopId"
WHERE nv."noteId" = n."id"
  AND s."plan" = 'FREE';

-- Recompute freeVisible for FREE shops: prioritize manual saves, then auto saves, newest first
WITH ranked_versions AS (
  SELECT
    nv."id",
    ROW_NUMBER() OVER (
      PARTITION BY nv."noteId"
      ORDER BY
        CASE WHEN nv."saveType" = 'MANUAL' THEN 0 ELSE 1 END,
        nv."createdAt" DESC,
        nv."id" DESC
    ) AS position
  FROM "NoteVersion" nv
  JOIN "Note" n ON n."id" = nv."noteId"
  JOIN "Shop" s ON s."id" = n."shopId"
  WHERE s."plan" = 'FREE'
)
UPDATE "NoteVersion" nv
SET "freeVisible" = true
FROM ranked_versions rv
WHERE nv."id" = rv."id"
  AND rv.position <= 5;

-- Add supporting indexes
CREATE INDEX IF NOT EXISTS "NoteVersion_noteId_freeVisible_createdAt_idx"
  ON "NoteVersion" ("noteId", "freeVisible", "createdAt");

CREATE INDEX IF NOT EXISTS "NoteVersion_noteId_saveType_createdAt_idx"
  ON "NoteVersion" ("noteId", "saveType", "createdAt");

