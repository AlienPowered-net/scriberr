# Session Table 503 Error Fix

## Problem
The application was experiencing 503 errors due to a `MissingSessionTableError`. The error indicated that the Prisma session table does not exist in the current database.

## Root Cause
1. The Prisma schema defines a `Session` model that maps to a `session` table (lowercase)
2. There was a migration that renamed the `Session` table to `session` (lowercase), but this migration may not have been applied properly in the deployment environment
3. The `DIRECT_URL` environment variable was missing, preventing Prisma migrations from running
4. The `RobustPrismaSessionStorage` class was throwing errors instead of gracefully handling table creation failures

## Solution

### 1. Fixed Migration Script
- Created `scripts/migrate-deploy-fixed.sh` that sets `DIRECT_URL` to `DATABASE_URL` if not already set
- Updated `package.json` to use the fixed migration script

### 2. Enhanced Session Storage
- Modified `app/utils/session-storage.server.ts` to:
  - Not throw errors when table creation fails
  - Gracefully handle both `Session` (uppercase) and `session` (lowercase) table names
  - Add the `ensureReady()` method that Shopify session storage expects

### 3. Database Initialization Script
- Created `scripts/init-database.js` that:
  - Checks for existing session tables
  - Renames `Session` to `session` if needed
  - Creates the session table with all required columns if it doesn't exist
  - Verifies the table is accessible

### 4. Updated Build Process
- Modified `vercel-build` script to include database initialization
- Updated `setup` script for local development

## Files Modified
- `prisma/schema.prisma` - Updated comments
- `package.json` - Updated build scripts
- `app/utils/session-storage.server.ts` - Enhanced error handling
- `scripts/migrate-deploy-fixed.sh` - New migration script
- `scripts/init-database.js` - New database initialization script
- `scripts/test-session-table.js` - New test script

## Testing
To test the fix locally:
```bash
npm run setup
```

To test the session table specifically:
```bash
node scripts/test-session-table.js
```

## Deployment
The fix will be applied automatically during the next deployment through the updated `vercel-build` script.

## Session Table Schema
The session table includes all required columns for Shopify session storage:
- `id` (TEXT, PRIMARY KEY)
- `shop` (TEXT, indexed)
- `state` (TEXT)
- `isOnline` (BOOLEAN)
- `scope` (TEXT, nullable)
- `expires` (TIMESTAMP, nullable)
- `accessToken` (TEXT, nullable)
- `userId` (BIGINT, nullable)
- `firstName` (TEXT, nullable)
- `lastName` (TEXT, nullable)
- `email` (TEXT, nullable)
- `accountOwner` (BOOLEAN, default false)
- `locale` (TEXT, nullable)
- `collaborator` (BOOLEAN, default false)
- `emailVerified` (BOOLEAN, default false)
- `onlineAccessInfo` (JSONB, nullable)
- `createdAt` (TIMESTAMP, default CURRENT_TIMESTAMP)
- `updatedAt` (TIMESTAMP, default CURRENT_TIMESTAMP)