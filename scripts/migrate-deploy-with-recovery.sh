#!/usr/bin/env bash
set -euo pipefail

echo "Starting migration deployment…"

# Ensure DIRECT_URL is a non-pooled Neon URL
if [ -z "${DIRECT_URL:-}" ] && [ -n "${NEON_DIRECT_URL:-}" ]; then
  export DIRECT_URL="$NEON_DIRECT_URL"
fi
if [ -z "${DIRECT_URL:-}" ] && [ -n "${DATABASE_URL:-}" ]; then
  # best-effort: strip '-pooler.' from host
  export DIRECT_URL="$(echo "$DATABASE_URL" | sed 's/-pooler\././')"
fi

echo "DATABASE_URL host: $(echo "$DATABASE_URL" | sed -E 's#(.*//[^@]*@)([^:/?]+).*#\2#')"
echo "DIRECT_URL host:   $(echo "$DIRECT_URL"   | sed -E 's#(.*//[^@]*@)([^:/?]+).*#\2#')"

# quick status
npx prisma migrate status || true

# If migrate deploy times out on advisory lock, we will retry.
attempt_deploy () {
  set +e
  npx prisma migrate deploy
  rc=$?
  set -e
  return $rc
}

# If Prisma reports failed migrations (P3009), mark them rolled back so they can re-apply cleanly.
resolve_failed () {
  echo "Checking for failed migrations…"
  failed=$(npx prisma migrate status 2>&1 | sed -n 's/.*The `\([^`]*\)` migration.*failed.*/\1/p' | head -n1)
  if [ -n "$failed" ]; then
    echo "Found failed migration: $failed — marking as rolled back…"
    npx prisma migrate resolve --rolled-back "$failed"
  fi
}

# First attempt
if ! attempt_deploy; then
  echo "First deploy failed — attempting resolution (advisory lock or failed migration)…"
  resolve_failed
  sleep 2
  # Second attempt
  if ! attempt_deploy; then
    echo "Second deploy failed — last try after resolution…"
    resolve_failed
    sleep 3
    attempt_deploy
  fi
fi

echo "Generating Prisma client…"
npx prisma generate

echo "Post-deploy status:"
npx prisma migrate status

# Verify our visibility migration was applied
if npx prisma migrate status | grep -E 'add_save_type_free_visible|note_version_visibility' >/dev/null; then
  echo "Visibility migration present in history."
else
  echo "WARNING: Visibility migration not found in history output; check _prisma_migrations table." >&2
fi

echo "Migration deployment completed."
