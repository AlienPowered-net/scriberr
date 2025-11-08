# Vercel Environment Variables Setup

## Required Environment Variables

Configure these in **Vercel → Project Settings → Environment Variables** for both **Preview** and **Production** environments:

### 1. DATABASE_URL (keep existing)
- **Value**: Pooled connection URL (host contains `-pooler.`)
- **Example**: `postgres://user:pass@ep-…-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require`
- **Do not change** - this is used by the application runtime

### 2. NEON_DIRECT_URL (new)
- **Value**: Same URL as DATABASE_URL but **without** `-pooler.` in the host
- **Example**: `postgres://user:pass@ep-….c-2.us-west-2.aws.neon.tech/neondb?sslmode=require`
- **Transform**: Remove `-pooler.` from the hostname

### 3. DIRECT_URL (new)
- **Value**: Same as NEON_DIRECT_URL
- **Example**: `postgres://user:pass@ep-….c-2.us-west-2.aws.neon.tech/neondb?sslmode=require`
- **Note**: Prisma reads DIRECT_URL for migrations (non-pooled connection required)

### 4. PRISMA_CLIENT_ENGINE_TYPE (optional)
- **Value**: `library`
- **Note**: Improves compatibility with serverless environments

## Quick Setup Steps

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Copy your existing `DATABASE_URL` value
3. Create `NEON_DIRECT_URL` by removing `-pooler.` from the hostname
4. Create `DIRECT_URL` with the same value as `NEON_DIRECT_URL`
5. (Optional) Add `PRISMA_CLIENT_ENGINE_TYPE=library`
6. Set all variables for **Preview** and **Production** environments
7. Redeploy

## Verification

After deployment, check the build logs for:
- `DIRECT_URL host: ep-….c-2.us-west-2.aws.neon.tech` (should NOT contain `-pooler.`)
- `Migration deployment completed.`
- `Visibility migration present in history.`

Visit `/api/version-health` to verify:
- Migrations are applied
- NoteVersion table is accessible

