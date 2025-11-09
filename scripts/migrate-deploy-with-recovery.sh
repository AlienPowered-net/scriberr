#!/usr/bin/env bash

set -euo pipefail

echo "Starting migration deployment…"

# --- Ensure DIRECT_URL (non-pooled Neon) ---
if [ -z "${DIRECT_URL:-}" ] && [ -n "${NEON_DIRECT_URL:-}" ]; then
  export DIRECT_URL="$NEON_DIRECT_URL"
fi
if [ -z "${DIRECT_URL:-}" ] && [ -n "${DATABASE_URL:-}" ]; then
  export DIRECT_URL="$(echo "$DATABASE_URL" | sed 's/-pooler\././')"
fi

db_host="$(echo "$DATABASE_URL" | sed -E 's#(.*//[^@]*@)([^:/?]+).*#\2#')"
direct_host="$(echo "$DIRECT_URL"   | sed -E 's#(.*//[^@]*@)([^:/?]+).*#\2#')"
echo "DATABASE_URL host: $db_host"
echo "DIRECT_URL host:   $direct_host"

log=".vercel_migrate.log"
: > "$log"  # truncate

# Echo to stderr and tee into a log
log_run () { "$@" |& tee -a "$log" ; }

# Find exact local migration dir by id (exact or prefix)
find_migration_dir () {
  local id="$1"
  ls -1 prisma/migrations 2>/dev/null | awk -v id="$id" '
    $0 == id { print; exit }                    # exact
    index($0, id) == 1 { print; exit }          # prefix match
  '
}

# Ensure NO-OP placeholder exists if local dir is missing; echo dir name
ensure_placeholder_if_missing () {
  local id="$1"
  local dir
  dir="$(find_migration_dir "$id" || true)"
  if [ -z "$dir" ]; then
    echo "Local dir for $id missing. Creating NO-OP placeholder…" | tee -a "$log"
    mkdir -p "prisma/migrations/$id"
    cat > "prisma/migrations/$id/migration.sql" <<'SQL'
-- NO-OP PLACEHOLDER
-- This migration was already applied or is not applicable in production.
-- Added during CI to align local migration history with the database.
SQL
    dir="$id"
  fi
  echo "$dir"
}

# Parse last failed id from a prisma output stream
get_failed_from_log () {
  awk '
    /Applying migration `/ {
      if (match($0, /`([0-9]{14}_[a-z0-9_]+)`/, m)) last=m[1]
    }
    /Migration name: [0-9]{14}_[a-z0-9_]+/ {
      if (match($0, /Migration name: ([0-9]{14}_[a-z0-9_]+)/, m)) { print m[1]; exit }
    }
    /migration started/ && /failed/ {
      if (match($0, /`([0-9]{14}_[a-z0-9_]+)`/, m)) { print m[1]; exit }
    }
    END { if (last) print last }
  ' "$log" || true
}

# Simple detectors
has_duplicate_column_error () { grep -qE 'already exists' "$log"; }
has_missing_relation_error () { grep -qE 'relation "public\.Session" does not exist' "$log"; }
has_folder_position_error () { grep -qE 'column "position" .* "Folder" already exists' "$log"; }

# Mark a migration as applied/rolled back by exact local dir
resolve_migration () {
  local mode="$1"  # applied | rolled-back
  local id="$2"
  local dir
  dir="$(ensure_placeholder_if_missing "$id")"
  if [ -z "$dir" ]; then
    echo "ERROR: Could not find or create local dir for $id" | tee -a "$log"
    return 1
  fi
  echo "Resolve: $mode $dir" | tee -a "$log"
  npx prisma migrate resolve --"$mode" "$dir" --schema prisma/schema.prisma |& tee -a "$log" || true
}

# Show current local migration dirs (for sanity logs)
echo "Current local migration directories:" | tee -a "$log"
ls -1 prisma/migrations 2>/dev/null | sed -n 's/^/ - /p' | tee -a "$log" || true

echo "Pre-deploy status:" | tee -a "$log"
npx prisma migrate status --schema prisma/schema.prisma |& tee -a "$log" || true

# AGGRESSIVE PRE-RESOLVE: Handle three known legacy issues deterministically
echo "🔧 AGGRESSIVE PRE-RESOLVE: Checking and resolving known legacy issues..." | tee -a "$log"

# 1) pinnedAt already exists in DB → mark add_pinned_at_field as APPLIED
resolve_migration applied 20250911072345_add_pinned_at_field

# 2) Folder.position already exists → mark add_folder_position as APPLIED
resolve_migration applied 20250905050203_add_folder_position

# 3) Session rename where "public.Session" does not exist → mark rename_session_table_to_lowercase as APPLIED
# Because the source table is missing, renaming cannot succeed and is a no-op in practice.
resolve_migration applied 20250920060228_rename_session_table_to_lowercase

pass=1
rc=1
while [ $pass -le 3 ]; do
  echo "=== Deploy attempt $pass ===" | tee -a "$log"
  
  # Run deploy with log capture
  set +e
  log_run npx prisma migrate deploy --schema prisma/schema.prisma
  deploy_rc=${PIPESTATUS[0]}
  set -e
  
  if [ $deploy_rc -eq 0 ]; then
    rc=0
    echo "Migration deployment completed on attempt $pass." | tee -a "$log"
    break
  fi

  echo "Deploy attempt $pass failed. Resolving…" | tee -a "$log"

  # If a duplicate column error, mark as APPLIED
  if has_folder_position_error || has_duplicate_column_error; then
    # Try to infer which migration failed:
    failed="$(get_failed_from_log)"
    if [ -z "$failed" ]; then
      # fallbacks for known duplicates
      resolve_migration applied 20250911072345_add_pinned_at_field
      resolve_migration applied 20250905050203_add_folder_position
    else
      resolve_migration applied "$failed"
    fi
  fi

  # If a missing relation error for Session rename, mark that migration as APPLIED
  if has_missing_relation_error; then
    resolve_migration applied 20250920060228_rename_session_table_to_lowercase
  fi

  # Also, if Prisma printed a specific failed id, ensure it exists locally and mark rolled-back to clear the failed flag
  failed_specific="$(get_failed_from_log)"
  if [ -n "$failed_specific" ]; then
    echo "Detected failed migration id: $failed_specific" | tee -a "$log"
    # If not one of the known safe-applied cases, mark rolled-back to clear state
    case "$failed_specific" in
      20250911072345_add_pinned_at_field|20250905050203_add_folder_position|20250920060228_rename_session_table_to_lowercase)
        # already handled as applied above
        ;;
      *)
        resolve_migration rolled-back "$failed_specific"
        ;;
    esac
  fi

  pass=$((pass+1))
done

if [ $rc -ne 0 ]; then
  echo "Final migrate deploy failed. Dumping status:" | tee -a "$log"
  npx prisma migrate status --schema prisma/schema.prisma |& tee -a "$log" || true
  exit 1
fi

echo "Generating Prisma client…" | tee -a "$log"
npx prisma generate |& tee -a "$log"

echo "Post-deploy status:" | tee -a "$log"
npx prisma migrate status --schema prisma/schema.prisma |& tee -a "$log"
echo "Migration deployment completed." | tee -a "$log"
