#!/usr/bin/env node

/**
 * Test database connection script
 * Run this to diagnose database connection issues
 */

import { PrismaClient } from '@prisma/client';

// Enhanced database URL with connection pool parameters
function getDatabaseUrl() {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  
  console.log('Original DATABASE_URL:', baseUrl.replace(/\/\/.*@/, '//***:***@')); // Hide credentials
  
  // Add connection pool parameters to the URL
  const url = new URL(baseUrl);
  url.searchParams.set('connection_limit', '20'); // Increase connection limit
  url.searchParams.set('pool_timeout', '60'); // Increase pool timeout to 60 seconds
  url.searchParams.set('connect_timeout', '60'); // Increase connect timeout to 60 seconds
  url.searchParams.set('socket_timeout', '60'); // Increase socket timeout to 60 seconds
  
  console.log('Enhanced DATABASE_URL:', url.toString().replace(/\/\/.*@/, '//***:***@')); // Hide credentials
  return url.toString();
}

async function testConnection() {
  console.log('🔍 Testing database connection...');
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    console.log('📡 Attempting to connect...');
    await prisma.$connect();
    console.log('✅ Database connected successfully!');
    
    console.log('🔍 Testing basic query...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Basic query successful:', result);
    
    console.log('🔍 Testing session table...');
    try {
      const sessionCount = await prisma.session.count();
      console.log('✅ Session table accessible, count:', sessionCount);
    } catch (error) {
      console.log('⚠️  Session table issue:', error.message);
    }
    
    console.log('🔍 Testing shop table...');
    try {
      const shopCount = await prisma.shop.count();
      console.log('✅ Shop table accessible, count:', shopCount);
    } catch (error) {
      console.log('⚠️  Shop table issue:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      clientVersion: error.clientVersion,
    });
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Database disconnected');
  }
}

// Run the test
testConnection().catch(console.error);