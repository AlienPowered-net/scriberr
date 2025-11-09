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
  awk '
    /migration started/ && /failed/ {
      if (match($0, /`([0-9]{14}_[a-z0-9_]+)`/, m)) { print m[1]; exit }
    }
  ' "$log"
}

has_duplicate_error () {
  grep -Eqi 'already exists|duplicate key|duplicate column|relation .* exists' "$log"
}

has_folder_position_error () {
  grep -q 'column "position" of relation "Folder" already exists' "$log"
}

resolve_failed () {
  local id="$1"
  [ -z "$id" ] && return 0
  if has_duplicate_error; then
    echo "Duplicate/exists error detected. Marking $id as APPLIED…"
    npx prisma migrate resolve --applied "$id" --schema prisma/schema.prisma || true
  else
    echo "Non-duplicate failure. Marking $id as ROLLED BACK…"
    npx prisma migrate resolve --rolled-back "$id" --schema prisma/schema.prisma || true
  fi
}

mark_folder_position_applied () {
  echo "Marking 20250905050203_add_folder_position as applied (duplicate column already exists)…"
  npx prisma migrate resolve --applied 20250905050203_add_folder_position --schema prisma/schema.prisma || true
}

echo "Pre-deploy status:"
npx prisma migrate status --schema prisma/schema.prisma || true

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

  # Known duplicate Folder.position case
  if has_folder_position_error; then
    mark_folder_position_applied
  fi

  # Detect failed migration id from deploy log, else from status
  failed_id="$(get_failed_from_deploy_log || true)"
  if [ -z "$failed_id" ]; then
    failed_id="$(get_failed_from_status || true)"
  fi

  if [ -n "$failed_id" ]; then
    echo "Detected failed migration id: $failed_id"
    resolve_failed "$failed_id"
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
