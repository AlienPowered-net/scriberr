#!/usr/bin/env node
/**
 * Database initialization script for Vercel deployments
 * Ensures database is properly set up with all migrations applied
 */

import { execSync } from 'child_process';

console.log('🔧 Initializing database...');

try {
  // Check if required environment variables are set
  if (!process.env.SCRIBERRNOTE_DATABASE_URL) {
    throw new Error('SCRIBERRNOTE_DATABASE_URL environment variable is not set');
  }

  console.log('📊 Environment check...');
  console.log('- DATABASE_URL:', process.env.SCRIBERRNOTE_DATABASE_URL ? '✓ SET' : '✗ NOT SET');
  console.log('- DIRECT_URL:', process.env.SCRIBERRNOTE_DIRECT_URL ? '✓ SET' : '⚠ NOT SET (will use main URL)');

  console.log('📊 Generating Prisma client...');
  execSync('prisma generate', { stdio: 'inherit' });

  console.log('🚀 Running database migrations...');
  
  // If DIRECT_URL is not set, temporarily set it to the main URL for migrations
  const originalDirectUrl = process.env.SCRIBERRNOTE_DIRECT_URL;
  if (!process.env.SCRIBERRNOTE_DIRECT_URL) {
    process.env.SCRIBERRNOTE_DIRECT_URL = process.env.SCRIBERRNOTE_DATABASE_URL;
    console.log('⚠ Using main database URL for migrations (DIRECT_URL not set)');
  }
  
  try {
    execSync('prisma migrate deploy', { stdio: 'inherit' });
  } catch (migrateError) {
    console.log('⚠ Migration deploy failed, checking for failed migrations...');
    
    // Check if this is the known failed migration issue
    if (migrateError.message.includes('P3009') || migrateError.message.includes('failed migrations')) {
      console.log('🔧 Resolving known failed migration: 20250830000000_fix_utf8_encoding');
      
      try {
        // Resolve the known failed migration
        execSync('npx prisma migrate resolve --rolled-back 20250830000000_fix_utf8_encoding', { stdio: 'inherit' });
        console.log('✅ Failed migration resolved, retrying deploy...');
        
        // Retry migration deploy
        execSync('prisma migrate deploy', { stdio: 'inherit' });
      } catch (resolveError) {
        console.log('⚠ Could not resolve failed migration automatically');
        throw resolveError;
      }
    } else {
      throw migrateError;
    }
  }
  
  // Restore original value
  if (!originalDirectUrl) {
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