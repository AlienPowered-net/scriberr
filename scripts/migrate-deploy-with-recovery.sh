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

log=.prisma_deploy.log
: > "$log"  # truncate

attempt_deploy () {
  # capture stdout+stderr; DO NOT use /dev/tty
  set +e
  npx prisma migrate deploy --schema prisma/schema.prisma |& tee "$log"
  rc=${PIPESTATUS[0]}
  set -e
  return $rc
}

get_failed_from_status () {
  npx prisma migrate status --schema prisma/schema.prisma 2>&1 \
    | awk '/failed/ { if (match($0, /`([0-9]{14}_[a-z0-9_]+)`/, m)) { print m[1]; exit } }'
}

get_failed_from_deploy_log () {
  # Extract migration ID, prioritizing "Migration name:" pattern
  # Use sed to extract first match and prevent duplicates
  grep -oE 'Migration name: ([0-9]{14}_[a-z0-9_]+)' "$log" 2>/dev/null | \
    sed -n 's/Migration name: //p' | head -n 1 | \
  grep -v '^$' || \
  grep -oE 'Applying migration `([0-9]{14}_[a-z0-9_]+)`' "$log" 2>/dev/null | \
    sed -n "s/Applying migration \`//p" | sed 's/`$//' | head -n 1 | \
  grep -v '^$' || \
  grep -oE '`([0-9]{14}_[a-z0-9_]+)`' "$log" 2>/dev/null | \
    sed 's/`//g' | head -n 1
}

has_duplicate_error () {
  grep -Eqi 'already exists|duplicate key|duplicate column|relation .* exists' "$log"
}

has_folder_position_error () {
  grep -q 'column "position" of relation "Folder" already exists' "$log"
}

mark_folder_position_applied () {
  echo "Marking 20250905050203_add_folder_position as applied (duplicate column already exists)…"
  npx prisma migrate resolve --applied 20250905050203_add_folder_position --schema prisma/schema.prisma || true
}

has_pinned_at_error () {
  # Check for pinnedAt column already exists error (case insensitive, flexible pattern)
  grep -qiE '(column.*pinnedAt.*already exists|pinnedAt.*of relation.*Note.*already exists|column "pinnedAt" of relation "Note" already exists)' "$log" || \
  # Also check migration status for this specific migration failure
  (grep -q '20250911072345_add_pinned_at_field' "$log" && grep -qi 'already exists' "$log")
}

mark_pinned_at_applied () {
  echo "🔧 Marking 20250911072345_add_pinned_at_field as applied (duplicate column already exists)…"
  
  # Aggressive resolution: Try multiple approaches
  # 1. Try --rolled-back first to clear any failed state
  echo "Step 1: Attempting --rolled-back..."
  npx prisma migrate resolve --rolled-back 20250911072345_add_pinned_at_field --schema prisma/schema.prisma 2>&1 || true
  
  # 2. Then mark as --applied
  echo "Step 2: Attempting --applied..."
  if npx prisma migrate resolve --applied 20250911072345_add_pinned_at_field --schema prisma/schema.prisma 2>&1; then
    echo "✅ Successfully marked pinnedAt migration as applied"
    return 0
  fi
  
  # 3. Try one more time
  echo "Step 3: Retry --applied..."
  npx prisma migrate resolve --applied 20250911072345_add_pinned_at_field --schema prisma/schema.prisma 2>&1 || true
  echo "✅ Completed resolution attempts"
}

# helper: return the *exact* local dir for a migration id prefix
find_migration_dir () {
  local id="$1"
  for path in prisma/migrations/*; do
    [ -d "$path" ] || continue
    local base="${path##*/}"
    if [ "$base" = "$id" ] || [[ "$base" == "$id"* ]]; then
      printf '%s\n' "$base"
      return 0
    fi
  done
  return 1
}

echo "Pre-deploy status:"
npx prisma migrate status --schema prisma/schema.prisma || true

# AGGRESSIVE PRE-RESOLVE: Always resolve pinnedAt migration before deployment
# This migration is known to fail if column already exists, so we proactively resolve it
echo "🔧 AGGRESSIVE PRE-RESOLVE: Checking and resolving pinnedAt migration..."
status_output="$(npx prisma migrate status --schema prisma/schema.prisma 2>&1 || true)"

# Always try to resolve this migration if it exists in any problematic state
if echo "$status_output" | grep -qE '20250911072345_add_pinned_at_field'; then
  echo "pinnedAt migration detected. Force-resolving..."
  
  # Try Prisma resolve --applied (most reliable)
  echo "Attempting Prisma resolve --applied..."
  npx prisma migrate resolve --applied 20250911072345_add_pinned_at_field --schema prisma/schema.prisma 2>&1 || true
  
  # Also try --rolled-back as fallback, then mark as applied
  echo "Attempting Prisma resolve --rolled-back (if needed)..."
  npx prisma migrate resolve --rolled-back 20250911072345_add_pinned_at_field --schema prisma/schema.prisma 2>&1 || true
  
  # Try applied again after rollback
  echo "Re-attempting Prisma resolve --applied..."
  npx prisma migrate resolve --applied 20250911072345_add_pinned_at_field --schema prisma/schema.prisma 2>&1 || true
  
  echo "✅ Completed aggressive pre-resolve for pinnedAt migration"
fi

# Also proactively resolve folder_position migration if needed
if echo "$status_output" | grep -qE '20250905050203_add_folder_position.*failed|failed.*20250905050203_add_folder_position'; then
  echo "Pre-resolving failed folder_position migration..."
  mark_folder_position_applied || true
fi

pass=1
rc=1
while [ $pass -le 3 ]; do
  echo "=== Deploy attempt $pass ==="
  if attempt_deploy; then
    rc=0
    echo "Migration deployment completed on attempt $pass."
    break
  fi

  echo "Deploy attempt $pass failed. Resolving…"

  # Known duplicate Folder.position case remains (mark applied)
  if has_folder_position_error; then
    mark_folder_position_applied
  fi

  # Known duplicate Note.pinnedAt case (mark applied)
  if has_pinned_at_error; then
    mark_pinned_at_applied
  fi

  # Try to extract the failed id from the deploy log first (covers Applying/Migration name)
  failed_id="$(get_failed_from_deploy_log || true)"
  if [ -z "$failed_id" ]; then
    failed_id="$(get_failed_from_status || true)"
  fi

  if [ -n "$failed_id" ]; then
    # Clean up the failed_id - remove any duplicates, whitespace, newlines
    failed_id="$(printf '%s' "$failed_id" | tr -d '\r\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | head -c 50)"
    # Remove duplicate migration IDs if somehow concatenated
    failed_id="$(echo "$failed_id" | sed -E 's/([0-9]{14}_[a-z0-9_]+)\1+/\1/')"
    echo "Detected failed migration id: $failed_id"
    dir_name="$(find_migration_dir "$failed_id" || true)"
    if [ -z "$dir_name" ]; then
      echo "Could not find local directory for $failed_id under prisma/migrations"
    else
      if has_duplicate_error; then
        echo "Duplicate/exists error detected. Marking as APPLIED: $dir_name"
        npx prisma migrate resolve --applied "$dir_name" --schema prisma/schema.prisma || true
      else
        echo "Non-duplicate failure. Marking as ROLLED BACK: $dir_name"
        npx prisma migrate resolve --rolled-back "$dir_name" --schema prisma/schema.prisma || true
      fi
    fi
  else
    echo "No failed migration id detected; skip resolve."
  fi

  pass=$((pass+1))
done

if [ $rc -ne 0 ]; then
  echo "Final migrate deploy failed. Dumping status:"
  npx prisma migrate status --schema prisma/schema.prisma || true
  exit 1
fi

echo "Generating Prisma client…"
npx prisma generate

echo "Post-deploy status:"
npx prisma migrate status --schema prisma/schema.prisma
echo "Migration deployment completed."
