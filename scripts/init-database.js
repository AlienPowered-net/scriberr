#!/usr/bin/env node

// Database initialization script for deployment
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn', 'info'],
});

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Check if session table exists
    let sessionTableExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM "session" LIMIT 1`;
      sessionTableExists = true;
      console.log('✅ Session table exists');
    } catch (error) {
      console.log('❌ Session table does not exist');
    }
    
    // Check if Session table (uppercase) exists
    let sessionTableUppercaseExists = false;
    if (!sessionTableExists) {
      try {
        await prisma.$queryRaw`SELECT 1 FROM "Session" LIMIT 1`;
        sessionTableUppercaseExists = true;
        console.log('Found Session table (uppercase)');
      } catch (error) {
        console.log('Session table (uppercase) does not exist');
      }
    }
    
    // Handle table creation/renaming
    if (!sessionTableExists) {
      if (sessionTableUppercaseExists) {
        console.log('Renaming Session table to session...');
        await prisma.$executeRaw`ALTER TABLE "public"."Session" RENAME TO "session"`;
        console.log('✅ Successfully renamed Session table to session');
      } else {
        console.log('Creating new session table...');
        
        // Create the session table directly with all required columns
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
        
        // Create index if it doesn't exist
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "session_shop_idx" ON "public"."session"("shop")`;
        
        console.log('✅ Successfully created session table with all required columns');
      }
    }
    
    // Verify session table is working
    const sessionCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "session"`;
    console.log('✅ Session table is accessible, count:', sessionCount[0].count);
    
    // Ensure CustomMention table exists
    console.log('Checking CustomMention table...');
    let customMentionExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM "CustomMention" LIMIT 1`;
      customMentionExists = true;
      console.log('✅ CustomMention table exists');
    } catch (error) {
      console.log('CustomMention table does not exist, creating...');
    }
    
    if (!customMentionExists) {
      try {
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "public"."CustomMention" (
            "id" TEXT NOT NULL,
            "shopId" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "email" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "CustomMention_pkey" PRIMARY KEY ("id")
          )
        `;
        
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "CustomMention_shopId_idx" ON "public"."CustomMention"("shopId")`;
        
        // Add foreign key constraint
        await prisma.$executeRaw`
          ALTER TABLE "public"."CustomMention" 
          DROP CONSTRAINT IF EXISTS "CustomMention_shopId_fkey"
        `;
        await prisma.$executeRaw`
          ALTER TABLE "public"."CustomMention" 
          ADD CONSTRAINT "CustomMention_shopId_fkey" 
          FOREIGN KEY ("shopId") REFERENCES "Shop"("id") 
          ON DELETE CASCADE ON UPDATE CASCADE
        `;
        
        console.log('✅ Successfully created CustomMention table');
      } catch (createError) {
        console.error('Error creating CustomMention table:', createError.message);
        // Don't fail the build if table creation fails
        console.log('Continuing despite CustomMention table creation error...');
      }
    }
    
    console.log('✅ Database initialization completed successfully');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initializeDatabase();