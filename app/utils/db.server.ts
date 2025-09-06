// app/utils/db.server.ts
import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Determine which database URL to use based on environment
function getDatabaseUrl() {
  // Check if we're in Vercel dev environment (you can set VERCEL_ENV in your dev environment)
  const isDevEnvironment = process.env.VERCEL_ENV === 'development' || 
                           process.env.VERCEL_GIT_COMMIT_REF === 'dev' ||
                           process.env.VERCEL_URL?.includes('scriberrdev');
  
  if (isDevEnvironment && process.env.SCRIBERRNOTE_DEV_DATABASE_URL) {
    console.log('🔧 Using dev database URL');
    return process.env.SCRIBERRNOTE_DEV_DATABASE_URL;
  }
  
  return process.env.SCRIBERRNOTE_DATABASE_URL;
}

if (process.env.NODE_ENV === "production") {
  const databaseUrl = getDatabaseUrl();
  
  // Ensure database URL is available in production
  if (!databaseUrl) {
    throw new Error("Database URL environment variable is required in production");
  }
  
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    // Optimized configuration for Vercel serverless
    log: ['error', 'warn'],
  });
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
  }
  prisma = global.__prisma;
}

// Ensure proper UTF-8 encoding for database operations
// PostgreSQL with Prisma automatically handles UTF-8 encoding

export { prisma };
