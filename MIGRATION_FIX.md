# Fix Failed Migration Issue

## Problem
The build is failing because Prisma detects a previously failed migration (`20250830000000_fix_utf8_encoding`) and blocks deployment with error P3009.

## Solution Steps

### 1. Set up Environment Variables
You need to set up the database URLs. Create a `.env` file with:

```bash
# Runtime pooled connection (your current one is like ...-pooler.neon.tech)
DATABASE_URL="postgresql://USER:PASSWORD@ep-...-pooler.neon.tech/neondb?sslmode=require"

# Direct primary for migrations
DIRECT_URL="postgresql://USER:PASSWORD@ep-...-primary.neon.tech/neondb?sslmode=require"
```

### 2. Run the Repair Script
Execute the repair script to resolve the failed migration:

```bash
# Make sure you're in the project directory
cd /path/to/your/project

# Set your DATABASE_URL environment variable
export DATABASE_URL="your-neon-database-url"

# Run the repair script to mark the migration as rolled back
./scripts/prisma-repair.sh 20250830000000_fix_utf8_encoding rolled-back
```

### 3. Alternative: Manual Resolution
If you prefer to do it manually:

```bash
# Check migration status
npx prisma migrate status

# Mark the failed migration as rolled back
npx prisma migrate resolve --rolled-back 20250830000000_fix_utf8_encoding

# Verify the status
npx prisma migrate status
```

### 4. Create a New Migration (Optional)
After resolving the failed migration, you can create a new one if needed:

```bash
# Create a new migration (only if you need database changes)
npx prisma migrate dev --name fix_utf8_encoding_v2
```

### 5. Deploy
Once the failed migration is resolved, the build should succeed:

```bash
git add .
git commit -m "Resolved failed migration"
git push origin main
```

## Why This Happened
- The original migration tried to change database encoding (`ALTER DATABASE ... SET ENCODING`)
- Neon PostgreSQL doesn't allow database-level encoding changes in migrations
- The migration failed and was recorded in `_prisma_migrations` table
- Prisma blocks new deployments until failed migrations are resolved

## Current UTF-8 Support
The application now handles UTF-8 encoding at the application level:
- Uses `str.normalize('NFC')` for proper Unicode normalization
- Applies UTF-8 headers in API responses
- Relies on PostgreSQL's native UTF-8 support

This approach is more reliable and doesn't require database-level changes.