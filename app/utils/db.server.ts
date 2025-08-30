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

export { prisma };
