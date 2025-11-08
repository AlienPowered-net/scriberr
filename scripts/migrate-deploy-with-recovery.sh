#!/usr/bin/env bash

set -euo pipefail

echo "Starting migration deployment…"

# --- Ensure DIRECT_URL is non-pooled (Neon) ---
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
  npx prisma migrate deploy --schema prisma/schema.prisma | tee "$log"
  return "${PIPESTATUS[0]}"
}

# Parse failed id from `prisma migrate status`
get_failed_from_status () {
  npx prisma migrate status --schema prisma/schema.prisma 2>&1 \
    | awk '/failed/ { if (match($0, /`([0-9]{14}_[a-z0-9_]+)`/, m)) { print m[1]; exit } }'
}

# Parse failed id from the last deploy log (P3009 text)
get_failed_from_deploy_log () {
  awk '
    /migration started/ && /failed/ {
      if (match($0, /`([0-9]{14}_[a-z0-9_]+)`/, m)) { print m[1]; exit }
    }
  ' "$log"
}

has_folder_position_error () {
  grep -q 'column "position" of relation "Folder" already exists' "$log"
}

mark_rolled_back () {
  local id="$1"
  [ -z "$id" ] && return 0
  echo "Marking failed migration as rolled back: $id"
  npx prisma migrate resolve --rolled-back "$id" --schema prisma/schema.prisma || true
}

mark_applied_folder_position () {
  echo "Marking 20250905050203_add_folder_position as applied (duplicate column already exists)…"
  npx prisma migrate resolve --applied 20250905050203_add_folder_position --schema prisma/schema.prisma || true
}

echo "Pre-deploy status:"
npx prisma migrate status --schema prisma/schema.prisma || true

pass=1
while [ $pass -le 3 ]; do
  echo "=== Deploy attempt $pass ==="

  set +e
  attempt_deploy
  rc=$?
  set -e

  if [ $rc -eq 0 ]; then
    echo "Migration deployment completed on attempt $pass."
    break
  fi

  echo "Deploy attempt $pass failed (rc=$rc). Resolving…"

  # 1) If duplicate Folder.position seen, mark as applied once
  if has_folder_position_error; then
    mark_applied_folder_position
  fi

  # 2) Resolve failed ID from deploy log, else from status
  failed_id="$(get_failed_from_deploy_log || true)"
  if [ -z "$failed_id" ]; then
    failed_id="$(get_failed_from_status || true)"
  fi

  if [ -n "$failed_id" ]; then
    echo "Detected failed migration id: $failed_id"
    mark_rolled_back "$failed_id"
  else
    echo "No failed migration id detected; skipping rollback."
  fi

  pass=$((pass+1))
done

if [ $rc -ne 0 ]; then
  echo "Final migrate deploy failed (rc=$rc). Dumping status:"
  npx prisma migrate status --schema prisma/schema.prisma || true
  exit $rc
fi

echo "Generating Prisma client…"
npx prisma generate

echo "Post-deploy status:"
npx prisma migrate status --schema prisma/schema.prisma
echo "Migration deployment completed."
