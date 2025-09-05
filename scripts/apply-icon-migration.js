#!/usr/bin/env node

/**
 * Script to apply folder icon migrations
 * Run this script after deployment to enable folder icon functionality
 */

const { PrismaClient } = require('@prisma/client');

async function applyIconMigration() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀 Applying folder icon migration...');
    
    // Check if columns already exist
    try {
      await prisma.$queryRaw`SELECT icon FROM "Folder" LIMIT 1`;
      console.log('✅ Icon columns already exist, migration not needed');
      return;
    } catch (error) {
      console.log('📋 Icon columns do not exist, applying migration...');
    }
    
    // Apply the migration
    await prisma.$executeRaw`ALTER TABLE "Folder" ADD COLUMN IF NOT EXISTS "icon" TEXT NOT NULL DEFAULT 'folder'`;
    await prisma.$executeRaw`ALTER TABLE "Folder" ADD COLUMN IF NOT EXISTS "iconColor" TEXT NOT NULL DEFAULT '#f57c00'`;
    await prisma.$executeRaw`ALTER TABLE "Folder" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0`;
    
    // Update existing folders to have proper position values
    await prisma.$executeRaw`
      UPDATE "Folder" SET "position" = (
        SELECT ROW_NUMBER() OVER (PARTITION BY "shopId" ORDER BY "createdAt" DESC) - 1
        FROM (SELECT "id", "shopId", "createdAt" FROM "Folder" f2 WHERE f2."id" = "Folder"."id") AS sub
      ) WHERE "position" = 0
    `;
    
    console.log('✅ Migration applied successfully!');
    console.log('🎉 Folder icon and position functionality is now enabled');
    
    // Verify the migration worked
    const testQuery = await prisma.$queryRaw`SELECT icon, "iconColor" FROM "Folder" LIMIT 1`;
    console.log('✅ Migration verification successful');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  applyIconMigration()
    .then(() => {
      console.log('🎯 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { applyIconMigration };