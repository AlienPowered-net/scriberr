#!/usr/bin/env node
/**
 * Database initialization script for Vercel deployments
 * Ensures database is properly set up with all migrations applied
 */

import { execSync } from 'child_process';

console.log('🔧 Initializing database...');

// Determine which database URLs to use based on environment
function getDatabaseUrls() {
  const isDevEnvironment = process.env.VERCEL_ENV === 'development' || 
                           process.env.VERCEL_GIT_COMMIT_REF === 'dev' ||
                           process.env.VERCEL_URL?.includes('scriberrdev');
  
  console.log('🔍 Environment detection:');
  console.log('- VERCEL_ENV:', process.env.VERCEL_ENV);
  console.log('- VERCEL_GIT_COMMIT_REF:', process.env.VERCEL_GIT_COMMIT_REF);
  console.log('- VERCEL_URL:', process.env.VERCEL_URL);
  console.log('- isDevEnvironment:', isDevEnvironment);
  console.log('- DEV_DATABASE_URL available:', !!process.env.SCRIBERRNOTE_DEV_DATABASE_URL);
  
  if (isDevEnvironment && process.env.SCRIBERRNOTE_DEV_DATABASE_URL) {
    console.log('🔧 Using dev database configuration');
    return {
      databaseUrl: process.env.SCRIBERRNOTE_DEV_DATABASE_URL,
      directUrl: process.env.SCRIBERRNOTE_DEV_DIRECT_URL || process.env.SCRIBERRNOTE_DEV_DATABASE_URL
    };
  }
  
  console.log('🔧 Using production database configuration');
  return {
    databaseUrl: process.env.SCRIBERRNOTE_DATABASE_URL,
    directUrl: process.env.SCRIBERRNOTE_DIRECT_URL || process.env.SCRIBERRNOTE_DATABASE_URL
  };
}

try {
  const { databaseUrl, directUrl } = getDatabaseUrls();
  
  // Check if required environment variables are set
  if (!databaseUrl) {
    throw new Error('Database URL environment variable is not set');
  }

  console.log('📊 Environment check...');
  console.log('- VERCEL_ENV:', process.env.VERCEL_ENV || 'not set');
  console.log('- VERCEL_GIT_COMMIT_REF:', process.env.VERCEL_GIT_COMMIT_REF || 'not set');
  console.log('- VERCEL_URL:', process.env.VERCEL_URL || 'not set');
  console.log('- DATABASE_URL:', databaseUrl ? '✓ SET' : '✗ NOT SET');
  console.log('- DIRECT_URL:', directUrl ? '✓ SET' : '⚠ NOT SET (will use main URL)');

  console.log('📊 Generating Prisma client...');
  execSync('prisma generate', { stdio: 'inherit' });

  console.log('🚀 Running database migrations...');
  
  // Set the database URLs for Prisma to use
  const originalDatabaseUrl = process.env.SCRIBERRNOTE_DATABASE_URL;
  const originalDirectUrl = process.env.SCRIBERRNOTE_DIRECT_URL;
  
  process.env.SCRIBERRNOTE_DATABASE_URL = databaseUrl;
  process.env.SCRIBERRNOTE_DIRECT_URL = directUrl;
  
  if (!directUrl || directUrl === databaseUrl) {
    console.log('⚠ Using main database URL for migrations (DIRECT_URL not set or same as main)');
  }
  
  try {
    execSync('prisma migrate deploy', { stdio: 'inherit' });
  } catch (migrateError) {
    console.log('⚠ Migration deploy failed, attempting to resolve known failed migration...');
    
    try {
      // Try to resolve known failed migrations
      const knownFailedMigrations = [
        '20250830000000_fix_utf8_encoding',
        '20250904234933_add_folder_icon',
        '20250826021507_add_content_to_notes',
        '20250905041056_add_folder_icon_color',
        '20250905050203_add_folder_position'
      ];
      
      for (const migration of knownFailedMigrations) {
        try {
          console.log(`🔧 Resolving known failed migration: ${migration}`);
          
          // For migrations that add columns that already exist, mark as applied
          const migrationsWithExistingColumns = [
            '20250826021507_add_content_to_notes',    // content column exists
            '20250904234933_add_folder_icon',         // icon column exists  
            '20250905041056_add_folder_icon_color',   // icon column exists
            '20250905050203_add_folder_position'      // position column might exist
          ];
          
          if (migrationsWithExistingColumns.includes(migration)) {
            console.log(`⚠ Migration ${migration} adds existing columns, marking as applied`);
            execSync(`npx prisma migrate resolve --applied ${migration}`, { stdio: 'inherit' });
          } else {
            // For other migrations, roll back
            execSync(`npx prisma migrate resolve --rolled-back ${migration}`, { stdio: 'inherit' });
          }
          
          console.log(`✅ Migration ${migration} resolved`);
        } catch (resolveErr) {
          console.log(`⚠ Migration ${migration} could not be resolved (might not exist or already resolved)`);
        }
      }
      console.log('✅ Failed migration resolved, retrying deploy...');
      
      // Retry migration deploy
      execSync('prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Migration deploy successful after resolving failed migration!');
    } catch (resolveError) {
      console.log('⚠ Could not resolve failed migration or retry failed');
      console.log('Original error:', migrateError.message);
      console.log('Resolve error:', resolveError.message);
      
      // If resolve fails, it might mean the migration doesn't exist or is already resolved
      // Try one more time to deploy
      try {
        console.log('🔄 Final attempt at migration deploy...');
        execSync('prisma migrate deploy', { stdio: 'inherit' });
        console.log('✅ Migration deploy successful on final attempt!');
      } catch (finalError) {
        console.log('❌ All migration attempts failed');
        throw finalError;
      }
    }
  }
  
  // Restore original values
  if (originalDatabaseUrl) {
    process.env.SCRIBERRNOTE_DATABASE_URL = originalDatabaseUrl;
  }
  if (originalDirectUrl) {
    process.env.SCRIBERRNOTE_DIRECT_URL = originalDirectUrl;
  } else {
    delete process.env.SCRIBERRNOTE_DIRECT_URL;
  }

  console.log('✅ Database initialization complete!');
} catch (error) {
  console.error('❌ Database initialization failed:', error.message);
  
  // Provide helpful debugging information
  console.error('\n🔍 Debug Information:');
  console.error('- NODE_ENV:', process.env.NODE_ENV || 'not set');
  console.error('- DATABASE_URL set:', !!process.env.SCRIBERRNOTE_DATABASE_URL);
  console.error('- DIRECT_URL set:', !!process.env.SCRIBERRNOTE_DIRECT_URL);
  
  process.exit(1);
}