#!/bin/bash
# scripts/prisma-repair.sh
# Purpose: Safely resolve a failed Prisma migration on the target DB.
# Why: Prisma blocks further deploys while a failed migration is recorded.
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to the SAME Neon DB used by Vercel}"

MIGRATION="${1:-20250830000000_fix_utf8_encoding}"
ACTION="${2:-rolled-back}" # allowed: rolled-back | applied

echo "Checking recent migrations..."
npx prisma migrate status

echo "Inspecting _prisma_migrations for ${MIGRATION} (optional if psql not installed)"
if command -v psql >/dev/null 2>&1; then
  psql "$DATABASE_URL" <<'SQL' || true
SELECT migration_name, started_at, finished_at, rolled_back_at, logs
FROM _prisma_migrations
ORDER BY started_at DESC
LIMIT 10;
SQL
else
  echo "psql not found. Skipping direct table inspection."
fi

case "$ACTION" in
  rolled-back)
    echo "Marking ${MIGRATION} as rolled back..."
    npx prisma migrate resolve --rolled-back "$MIGRATION"
    ;;
  applied)
    echo "Marking ${MIGRATION} as applied..."
    npx prisma migrate resolve --applied "$MIGRATION"
    ;;
  *)
    echo "Unknown ACTION: $ACTION"; exit 2
    ;;
esac

echo "Status after resolve:"
npx prisma migrate status

cat <<'NEXT'
Next steps:
1) If you rolled it back: fix the migration content locally and create a new one:
   npx prisma migrate dev --name fix_utf8_encoding_v2
   # Test on a dev DB, then commit and redeploy.

2) If you marked as applied: ensure the DB truly matches the schema.
   npx prisma db pull
   npx prisma validate
NEXT