// app/utils/db.server.ts
import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Enhanced database URL with connection pool parameters
function getDatabaseUrl() {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  
  // Add connection pool parameters to the URL
  const url = new URL(baseUrl);
  url.searchParams.set('connection_limit', '20'); // Increase connection limit
  url.searchParams.set('pool_timeout', '60'); // Increase pool timeout to 60 seconds
  url.searchParams.set('connect_timeout', '60'); // Increase connect timeout to 60 seconds
  url.searchParams.set('socket_timeout', '60'); // Increase socket timeout to 60 seconds
  
  return url.toString();
}

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    // Add connection pool configuration for Vercel
    log: ['error', 'warn'],
  });
} else {
  if (!global.__prisma) global.__prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
  prisma = global.__prisma;
}

// Connection retry mechanism
async function connectWithRetry(prismaClient: PrismaClient, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prismaClient.$connect();
      console.log('Database connected successfully');
      return;
    } catch (error) {
      console.error(`Database connection attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) {
        throw error;
      }
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

// Initialize connection with retry
if (process.env.NODE_ENV === "production") {
  connectWithRetry(prisma).catch(error => {
    console.error('Failed to connect to database after retries:', error);
  });
}

// Ensure proper UTF-8 encoding for database operations
// PostgreSQL with Prisma automatically handles UTF-8 encoding

export { prisma };
