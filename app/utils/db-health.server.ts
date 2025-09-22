// app/utils/db-health.server.ts
import { prisma } from "./db.server";

export interface DatabaseHealthStatus {
  isHealthy: boolean;
  sessionTableExists: boolean;
  sessionTableAccessible: boolean;
  error?: string;
  details: {
    connectionStatus: 'connected' | 'disconnected' | 'error';
    sessionTableStatus: 'exists' | 'missing' | 'error' | 'renamed';
    lastChecked: Date;
  };
}

export async function checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
  const status: DatabaseHealthStatus = {
    isHealthy: false,
    sessionTableExists: false,
    sessionTableAccessible: false,
    details: {
      connectionStatus: 'disconnected',
      sessionTableStatus: 'missing',
      lastChecked: new Date(),
    },
  };

  try {
    // Test database connection
    await prisma.$connect();
    status.details.connectionStatus = 'connected';

    // Check if session table exists
    try {
      await prisma.$queryRaw`SELECT 1 FROM "session" LIMIT 1`;
      status.sessionTableExists = true;
      status.sessionTableAccessible = true;
      status.details.sessionTableStatus = 'exists';
      status.isHealthy = true;
    } catch (sessionError: any) {
      // Check if Session table (uppercase) exists
      try {
        await prisma.$queryRaw`SELECT 1 FROM "Session" LIMIT 1`;
        status.sessionTableExists = true;
        status.sessionTableAccessible = false; // Wrong case
        status.details.sessionTableStatus = 'renamed';
        status.error = 'Session table exists but with wrong case (Session vs session)';
      } catch (upperCaseError: any) {
        status.sessionTableExists = false;
        status.sessionTableAccessible = false;
        status.details.sessionTableStatus = 'missing';
        status.error = 'Session table does not exist';
      }
    }

  } catch (connectionError: any) {
    status.details.connectionStatus = 'error';
    status.error = `Database connection failed: ${connectionError.message}`;
  }

  return status;
}

export async function repairDatabaseHealth(): Promise<{ success: boolean; message: string }> {
  try {
    const health = await checkDatabaseHealth();
    
    if (health.isHealthy) {
      return { success: true, message: 'Database is already healthy' };
    }

    // If session table exists but with wrong case, rename it
    if (health.details.sessionTableStatus === 'renamed') {
      try {
        await prisma.$executeRaw`ALTER TABLE "public"."Session" RENAME TO "session"`;
        return { success: true, message: 'Successfully renamed Session table to session' };
      } catch (error: any) {
        return { success: false, message: `Failed to rename Session table: ${error.message}` };
      }
    }

    // If session table doesn't exist, create it
    if (health.details.sessionTableStatus === 'missing') {
      try {
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "public"."session" (
            "id" TEXT NOT NULL,
            "shop" TEXT NOT NULL,
            "state" TEXT NOT NULL,
            "isOnline" BOOLEAN NOT NULL,
            "scope" TEXT,
            "expires" TIMESTAMP(3),
            "accessToken" TEXT,
            "userId" BIGINT,
            "firstName" TEXT,
            "lastName" TEXT,
            "email" TEXT,
            "accountOwner" BOOLEAN DEFAULT false,
            "locale" TEXT,
            "collaborator" BOOLEAN DEFAULT false,
            "emailVerified" BOOLEAN DEFAULT false,
            "onlineAccessInfo" JSONB,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "session_pkey" PRIMARY KEY ("id")
          )
        `;
        
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "session_shop_idx" ON "public"."session"("shop")`;
        
        return { success: true, message: 'Successfully created session table' };
      } catch (error: any) {
        return { success: false, message: `Failed to create session table: ${error.message}` };
      }
    }

    return { success: false, message: 'Unknown database health issue' };

  } catch (error: any) {
    return { success: false, message: `Database repair failed: ${error.message}` };
  }
}