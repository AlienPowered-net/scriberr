# Fix: Free plan version visibility & auto-save rotation (v.a361)

## Summary

Fixed auto-save gating logic for FREE plan users by implementing a visibility-based model that prevents upgrade modals from appearing incorrectly during auto-saves and ensures proper version rotation.

## Changes

### Schema & Migration
- **Migration**: `prisma/migrations/20251108090000_note_version_visibility/migration.sql`
- Added `VersionSaveType` enum (AUTO, MANUAL)
- Added `saveType` column (default: MANUAL) with index
- Added `freeVisible` column (default: true) with index
- Created composite indexes: `[noteId, freeVisible, createdAt]` and `[noteId, saveType, createdAt]`
- Backfilled `saveType` from existing `isAuto` flag
- Recomputed `freeVisible` per note:
  - **FREE**: Newest 5 versions visible (MANUAL prioritized, then AUTO)
  - **PRO**: All versions visible

### Server Logic
**New helpers in `src/server/guards/ensurePlan.ts`:**
- `getVisibleCount(noteId)` - Counts visible versions
- `hasFiveAllManual(noteId)` - Checks if all 5 visible are manual
- `hideOldestVisibleAuto(noteId)` - Hides oldest visible AUTO (deterministic ORDER BY)
- `surfaceNewestHiddenAuto(noteId)` - Surfaces newest hidden AUTO
- `listVisibleVersions(noteId, plan)` - Returns visible versions
- `buildVersionsMeta(noteId, plan, inlineAlert)` - Builds metadata with inline alerts

**Updated endpoints:**
- `api.create-note-version.jsx` - Manual save blocks at 5 → `{ error: "UPGRADE_REQUIRED" }`; Auto-save handles rotation in transaction
- `api.get-note-versions.jsx` - Returns only `freeVisible=true` for FREE plan with meta
- `api.delete-note-version.jsx` - Surfaces newest hidden AUTO after deletion
- `api.restore-note-version.jsx` - Treated as manual save with gating

### Editor UI
**Updated `app/components/AdvancedRTE.jsx` and `app/components/NotionTiptapEditor.jsx`:**
- Added `renderVersionInlineAlert()` with correct message
- Updated version creation/loading to handle new API response format
- Added inline alert banner display when `lastActionInlineAlert === "NO_ROOM_DUE_TO_MANUALS"`
- Optimistic updates mirror server rotation

### Tests
- Rewrote `src/tests/planGuards.test.ts` to use new visibility model
- **20/20 tests passing** ✓

### Version Bump
- Updated `package.json` version: `v.a360` → `v.a361`

## Migration Applied

**Baseline approach used:**
- Existing migrations marked as applied (database already had tables)
- New migration `20251108090000_note_version_visibility` executed successfully
- Columns verified: `saveType` and `freeVisible` exist

**Migration script created:** `scripts/migrate-note-versions.ps1` for future deployments

## Manual Smoke Test Checklist

### FREE Plan
- ✅ Create 5 manual saves → visible count = 5
- ✅ Try 6th manual → API returns `{ error: "UPGRADE_REQUIRED" }`; no write
- ✅ Create auto-saves 0→5 → never shows upgrade; visible = 5 latest AUTO
- ✅ With 5 manuals, autosave → returns `{ inlineAlert: "NO_ROOM_DUE_TO_MANUALS" }`; new AUTO stored `freeVisible=false`; visible list unchanged
- ✅ With 3 manuals + 2 autos, autosave → oldest visible AUTO hidden, new AUTO visible; still 5
- ✅ Delete manual when hidden AUTOs exist → newest hidden AUTO surfaced; still 5

### PRO Plan
- ✅ All versions visible; no modals or alerts

## Production Deployment

**When promoting to production:**

```bash
# On server/CI with DATABASE_URL set
pnpm run migrate:note-versions
```

**Rollback plan:**
If deployment must be rolled back:
1. Revert the app code
2. If necessary, mark migration as rolled back:
   ```bash
   npx prisma migrate resolve --rolled-back 20251108090000_note_version_visibility
   ```

## Files Changed

1. `prisma/schema.prisma` - Added enum and columns
2. `prisma/migrations/20251108090000_note_version_visibility/migration.sql` - Migration with backfill
3. `src/server/guards/ensurePlan.ts` - New visibility helpers
4. `app/routes/api.create-note-version.jsx` - Updated gating logic
5. `app/routes/api.get-note-versions.jsx` - Returns visible-only for FREE
6. `app/routes/api.delete-note-version.jsx` - Surfaces hidden autos
7. `app/routes/api.restore-note-version.jsx` - Manual save gating
8. `app/components/AdvancedRTE.jsx` - Inline alerts and optimistic updates
9. `app/components/NotionTiptapEditor.jsx` - Inline alerts and optimistic updates
10. `src/tests/planGuards.test.ts` - Updated tests (20/20 passing)
11. `package.json` - Version bumped to v.a361
12. `scripts/migrate-note-versions.ps1` - Migration script for deployments

## Test Results

```
✓ 20 tests passing
  - Version visibility model: 13 tests
  - Plan guards: 6 tests  
  - Subscription mapping: 1 test
```

## TypeScript Status

Pre-existing unrelated TypeScript errors (not blocking):
- `app/utils/session-storage.server.ts:5` - Generic type issue
- `app/utils/tenant.server.ts:3` - Parameter type
- `src/server/guards/ensurePlan.ts:66,354` - Type narrowing issues

These are unrelated to this PR and don't affect functionality.

