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

echo "DATABASE_URL host: $(echo "$DATABASE_URL" | sed -E 's#(.*//[^@]*@)([^:/?]+).*#\2#')"
echo "DIRECT_URL host:   $(echo "$DIRECT_URL"   | sed -E 's#(.*//[^@]*@)([^:/?]+).*#\2#')"

attempt_deploy () {
  set +e
  npx prisma migrate deploy
  rc=$?
  set -e
  return $rc
}

resolve_failed () {
  echo "Checking for failed migrations…"
  # Robustly grep the failed migration name from status output
  failed="$(npx prisma migrate status 2>&1 | grep -oE '\`[0-9]{14}_[a-z0-9_]+' | tr -d '\`' | head -n1 || true)"
  if [ -n "$failed" ]; then
    echo "Found failed migration: $failed — marking as rolled back…"
    npx prisma migrate resolve --rolled-back "$failed"
  else
    # Explicitly handle the known one if grep didn't catch it (as seen in logs)
    npx prisma migrate resolve --rolled-back 20250102100000_add_save_type_free_visible || true
  fi
}

echo "Pre-deploy status:"
npx prisma migrate status || true

if ! attempt_deploy; then
  echo "First deploy failed. Resolving and retrying…"
  resolve_failed
  sleep 2
  attempt_deploy
fi

echo "Generating Prisma client…"
npx prisma generate

echo "Post-deploy status:"
npx prisma migrate status
