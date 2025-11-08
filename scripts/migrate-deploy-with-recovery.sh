#!/usr/bin/env bash

set -euo pipefail

echo "Starting migration deployment…"

# --- Ensure DIRECT_URL is a non-pooled Neon URL (no '-pooler.') ---
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

# --- Helpers (NO TTY/tee usage anywhere) ---

attempt_deploy () {
  # print full output (no prompts)
  npx prisma migrate deploy --schema prisma/schema.prisma
}

get_failed_id () {
  # parse only lines that contain 'failed'
  npx prisma migrate status --schema prisma/schema.prisma 2>&1 \
    | awk '/failed/ { if (match($0, /`([0-9]{14}_[a-z0-9_]+)`/, m)) { print m[1]; exit } }'
}

has_folder_position_error () {
  # grep last deploy attempt logs that we saved to a file
  # (we avoid /dev/tty; use a tmp file)
  [ -f .prisma_deploy.log ] && grep -q 'column "position" of relation "Folder" already exists' .prisma_deploy.log
}

mark_failed_as_rolled_back () {
  local id="$1"
  if [ -n "$id" ]; then
    echo "Marking failed migration as rolled back: $id"
    # Ignore P3011 if it wasn't applied
    npx prisma migrate resolve --rolled-back "$id" --schema prisma/schema.prisma || true
  fi
}

mark_folder_position_as_applied () {
  echo "Marking 20250905050203_add_folder_position as applied (duplicate column already exists)…"
  npx prisma migrate resolve --applied 20250905050203_add_folder_position --schema prisma/schema.prisma || true
}

echo "Pre-deploy status:"
npx prisma migrate status --schema prisma/schema.prisma || true

# --- First deploy attempt (log to file, no TTY) ---
set +e
attempt_deploy | tee .prisma_deploy.log
rc=$?
set -e

if [ $rc -eq 0 ]; then
  echo "Migration deployment completed on first attempt."
else
  echo "First deploy failed with rc=$rc"

  # If the classic duplicate column error was seen, mark that migration as applied once
  if has_folder_position_error; then
    echo "Detected folder_position duplicate column. Resolving…"
    mark_folder_position_as_applied
  fi

  # Resolve actual failed id, if any
  failed_id="$(get_failed_id || true)"
  if [ -n "$failed_id" ]; then
    echo "Detected failed migration from status: $failed_id"
    mark_failed_as_rolled_back "$failed_id"
  else
    echo "No failed id reported by status; skipping generic rollback."
  fi

  # --- Second attempt ---
  set +e
  attempt_deploy | tee .prisma_deploy.log
  rc=$?
  set -e

  if [ $rc -ne 0 ]; then
    echo "Second deploy failed with rc=$rc"

    # Try one last time: if the folder_position error still happens, ensure it's applied
    if has_folder_position_error; then
      echo "Duplicate Folder.position still present. Re-marking as applied…"
      mark_folder_position_as_applied
    fi

    # Re-check failed id and resolve once more if any
    failed_id="$(get_failed_id || true)"
    if [ -n "$failed_id" ]; then
      echo "Resolving failed migration again: $failed_id"
      mark_failed_as_rolled_back "$failed_id"
    fi

    # --- Final attempt ---
    set +e
    attempt_deploy | tee .prisma_deploy.log
    rc=$?
    set -e

    if [ $rc -ne 0 ]; then
      echo "Final migrate deploy failed (rc=$rc). Showing status for debugging:"
      npx prisma migrate status --schema prisma/schema.prisma || true
      exit $rc
    fi
  fi
fi

echo "Generating Prisma client…"
npx prisma generate

echo "Post-deploy status:"
npx prisma migrate status --schema prisma/schema.prisma
echo "Migration deployment completed."
