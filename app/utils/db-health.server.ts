// app/utils/db-health.server.ts
import { prisma } from "./db.server";

export interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  connectionTime: number;
  queryTime: number;
  error?: string;
  details: {
    canConnect: boolean;
    canQuery: boolean;
    sessionTableExists: boolean;
    shopTableExists: boolean;
  };
}

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const startTime = Date.now();
  const health: DatabaseHealth = {
    status: 'healthy',
    connectionTime: 0,
    queryTime: 0,
    details: {
      canConnect: false,
      canQuery: false,
      sessionTableExists: false,
      shopTableExists: false,
    },
  };

  try {
    // Test connection
    const connectStart = Date.now();
    await prisma.$connect();
    health.details.canConnect = true;
    health.connectionTime = Date.now() - connectStart;

    // Test basic query
    const queryStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    health.details.canQuery = true;
    health.queryTime = Date.now() - queryStart;

    // Test session table
    try {
      await prisma.$queryRaw`SELECT 1 FROM "session" LIMIT 1`;
      health.details.sessionTableExists = true;
    } catch (error) {
      console.warn('Session table not accessible:', error);
    }

    // Test shop table
    try {
      await prisma.$queryRaw`SELECT 1 FROM "Shop" LIMIT 1`;
      health.details.shopTableExists = true;
    } catch (error) {
      console.warn('Shop table not accessible:', error);
    }

    // Determine overall status
    if (!health.details.canConnect || !health.details.canQuery) {
      health.status = 'unhealthy';
    } else if (!health.details.sessionTableExists || !health.details.shopTableExists) {
      health.status = 'degraded';
    }

  } catch (error) {
    health.status = 'unhealthy';
    health.error = error instanceof Error ? error.message : 'Unknown error';
    console.error('Database health check failed:', error);
  }

  return health;
}

export async function getDatabaseStats() {
  try {
    const [shopCount, folderCount, noteCount, sessionCount] = await Promise.all([
      prisma.shop.count().catch(() => 0),
      prisma.folder.count().catch(() => 0),
      prisma.note.count().catch(() => 0),
      prisma.session.count().catch(() => 0),
    ]);

    return {
      shops: shopCount,
      folders: folderCount,
      notes: noteCount,
      sessions: sessionCount,
    };
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return {
      shops: 0,
      folders: 0,
      notes: 0,
      sessions: 0,
    };
  }
}