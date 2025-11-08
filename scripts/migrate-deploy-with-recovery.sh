#!/usr/bin/env bash
set -euo pipefail

echo "Starting migration deployment…"

# Use Neon DIRECT URL (non-pooled) for migrations
if [ -z "${DIRECT_URL:-}" ] && [ -n "${NEON_DIRECT_URL:-}" ]; then
  export DIRECT_URL="$NEON_DIRECT_URL"
fi
if [ -z "${DIRECT_URL:-}" ] && [ -n "${DATABASE_URL:-}" ]; then
  export DIRECT_URL="$(echo "$DATABASE_URL" | sed 's/-pooler\././')"
fi

db_host="$(echo "$DATABASE_URL" | sed -E 's#(.*//[^@]*@)([^:/?]+).*#\2#')"
direct_host="$(echo "$DIRECT_URL" | sed -E 's#(.*//[^@]*@)([^:/?]+).*#\2#')"
echo "DATABASE_URL host: $db_host"
echo "DIRECT_URL host:   $direct_host"

echo "Pre-deploy status:"
npx prisma migrate status || true

attempt_deploy () {
  set +e
  # Capture output but also let it pass through to terminal
  deploy_output="$(npx prisma migrate deploy 2>&1 | tee /dev/tty)"
  rc=$?
  set -e
  
  # Check for the specific folder_position error
  if echo "$deploy_output" | grep -qE '(column "position"|add_folder_position)'; then
    echo "Detected folder_position column already exists error"
    mark_folder_position_applied
  fi
  
  return $rc
}

# return the failed migration id, if any, by scanning only lines that mention 'failed'
get_failed_id () {
  npx prisma migrate status 2>&1 \
    | awk '/failed/ { if (match($0, /`([0-9]{14}_[a-z0-9_]+)`/, m)) { print m[1]; exit } }'
}

resolve_failed () {
  echo "Checking for failed migrations…"
  failed="$(get_failed_id || true)"
  if [ -z "$failed" ]; then
    # Fallback: explicitly handle the one that keeps appearing in logs
    failed="20250102100000_add_save_type_free_visible"
    echo "No failed id parsed; using fallback: $failed"
  else
    echo "Found failed migration: $failed"
  fi

  # Try to mark as rolled back; ignore P3011 if it wasn't applied.
  set +e
  npx prisma migrate resolve --rolled-back "$failed"
  rc=$?
  set -e
  if [ $rc -ne 0 ]; then
    echo "Resolve returned rc=$rc (likely not applied / P3011). Continuing…"
  fi
}

mark_folder_position_applied () {
  echo "Detected 'column position already exists' previously — marking 20250905050203_add_folder_position as applied…"
  npx prisma migrate resolve --applied 20250905050203_add_folder_position || true
}

if ! attempt_deploy; then
  echo "First deploy failed. Resolving and retrying…"
  resolve_failed
  failed="$(get_failed_id || echo '20250102100000_add_save_type_free_visible')"
  # If we previously saw the folder_position error, mark it as applied
  if echo "$failed" | grep -q "add_folder_position"; then
    mark_folder_position_applied
  fi
  sleep 2
  if ! attempt_deploy; then
    echo "Second deploy failed. Resolving once more and final retry…"
    resolve_failed
    failed="$(get_failed_id || echo '20250102100000_add_save_type_free_visible')"
    # If we previously saw the folder_position error, mark it as applied
    if echo "$failed" | grep -q "add_folder_position"; then
      mark_folder_position_applied
    fi
    sleep 2
    attempt_deploy
  fi
fi

echo "Generating Prisma client…"
npx prisma generate

echo "Post-deploy status:"
npx prisma migrate status
echo "Migration deployment completed."
