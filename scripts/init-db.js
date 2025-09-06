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

  console.log('📊 Generating Prisma client...');
  execSync('prisma generate', { stdio: 'inherit' });

  console.log('🚀 Running database migrations...');
  execSync('prisma migrate deploy', { stdio: 'inherit' });

  console.log('✅ Database initialization complete!');
} catch (error) {
  console.error('❌ Database initialization failed:', error.message);
  process.exit(1);
}