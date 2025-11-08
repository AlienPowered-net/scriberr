-- Create enum for save types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VersionSaveType') THEN
    CREATE TYPE "VersionSaveType" AS ENUM ('AUTO', 'MANUAL');
  END IF;
END $$;

-- Add new columns with defaults
ALTER TABLE "NoteVersion"
  ADD COLUMN IF NOT EXISTS "saveType" "VersionSaveType" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "freeVisible" BOOLEAN NOT NULL DEFAULT true;

-- Backfill saveType from existing isAuto flag or known pathways
UPDATE "NoteVersion"
SET "saveType" = CASE
  WHEN "isAuto" IS TRUE THEN 'AUTO'::"VersionSaveType"
  ELSE 'MANUAL'::"VersionSaveType"
END;

-- Mark everything hidden by default; we'll repopulate below
UPDATE "NoteVersion"
SET "freeVisible" = false;

-- Make every version visible for PRO plans
WITH pro_notes AS (
  SELECT n.id AS note_id
  FROM "Note" n
  JOIN "Shop" s ON s.id = n."shopId"
  WHERE COALESCE(s.plan, 'FREE') <> 'FREE'
)
UPDATE "NoteVersion" nv
SET "freeVisible" = true
FROM pro_notes pn
WHERE nv."noteId" = pn.note_id;

-- Compute visibility for Free plan (max 5 per note, manuals prioritised)
WITH ranked_versions AS (
  SELECT
    nv.id,
    ROW_NUMBER() OVER (
      PARTITION BY nv."noteId"
      ORDER BY
        CASE WHEN nv."saveType" = 'MANUAL' THEN 0 ELSE 1 END,
        nv."createdAt" DESC,
        nv.id DESC
    ) AS rn
  FROM "NoteVersion" nv
  JOIN "Note" n ON n.id = nv."noteId"
  JOIN "Shop" s ON s.id = n."shopId"
  WHERE COALESCE(s.plan, 'FREE') = 'FREE'
)
UPDATE "NoteVersion" nv
SET "freeVisible" = true
FROM ranked_versions rv
WHERE nv.id = rv.id
  AND rv.rn <= 5;

-- Create supporting indexes
CREATE INDEX IF NOT EXISTS "NoteVersion_noteId_freeVisible_createdAt_idx"
  ON "NoteVersion" ("noteId", "freeVisible", "createdAt");

CREATE INDEX IF NOT EXISTS "NoteVersion_noteId_saveType_createdAt_idx"
  ON "NoteVersion" ("noteId", "saveType", "createdAt");

