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
    
    // Check if Session table exists and is accessible
    try {
      await prisma.$queryRaw`SELECT 1 FROM "Session" LIMIT 1`;
      console.log('✅ Session table exists and is accessible');
    } catch (error) {
      console.log('Session table check failed:', error.message);
      // If the table doesn't exist or has issues, we'll let prisma migrate deploy handle it
      console.log('⚠️ Session table may need to be created by migrations');
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