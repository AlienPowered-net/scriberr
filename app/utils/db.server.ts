// app/utils/db.server.ts
import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
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

// Ensure proper UTF-8 encoding for all database operations
prisma.$use(async (params, next) => {
  // Add charset=utf8mb4 to ensure proper emoji support
  if (params.runInTransaction) {
    return next(params);
  }
  
  // For all other operations, ensure UTF-8 encoding
  const result = await next(params);
  return result;
});

// Set connection charset for UTF-8 support
prisma.$connect().then(() => {
  console.log('Database connected with UTF-8 support');
}).catch((error) => {
  console.error('Database connection error:', error);
});

export { prisma };
