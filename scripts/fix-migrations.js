#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMigrations() {
  try {
    console.log('🚀 Fixing migration issues...');
    
    // Check if the failed migration exists in the database
    try {
      const result = await prisma.$queryRaw`
        SELECT * FROM "_prisma_migrations" 
        WHERE migration_name = '20250830000000_fix_utf8_encoding'
      `;
      
      if (result.length > 0) {
        console.log('Found failed migration, marking as resolved...');
        await prisma.$executeRaw`
          UPDATE "_prisma_migrations" 
          SET finished_at = NOW(), 
              logs = 'Manually resolved - migration file not found locally'
          WHERE migration_name = '20250830000000_fix_utf8_encoding' 
          AND finished_at IS NULL
        `;
        console.log('✅ Failed migration marked as resolved');
      }
    } catch (error) {
      console.log('Migration check failed:', error.message);
    }
    
    // Ensure Session table exists
    try {
      await prisma.$queryRaw`SELECT 1 FROM "Session" LIMIT 1`;
      console.log('✅ Session table exists');
    } catch (error) {
      console.log('Creating Session table...');
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "public"."Session" (
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
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
        )
      `;
      
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Session_shop_idx" ON "public"."Session"("shop")`;
      console.log('✅ Session table created');
    }
    
    console.log('✅ Migration fix completed successfully');
    
  } catch (error) {
    console.error('Migration fix failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixMigrations();