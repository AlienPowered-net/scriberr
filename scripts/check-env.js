#!/usr/bin/env node
/**
 * Environment variable checker for Shopify app
 * Helps debug configuration issues in dev environment
 */

console.log('🔍 Shopify App Environment Check');
console.log('================================');

const requiredVars = [
  'SHOPIFY_API_KEY',
  'SHOPIFY_API_SECRET',
  'SHOPIFY_API_SECRET_KEY', 
  'SCOPES',
  'SHOPIFY_APP_URL',
  'APP_URL'
];

const databaseVars = [
  'SCRIBERRNOTE_DATABASE_URL',
  'SCRIBERRNOTE_DIRECT_URL',
  'SCRIBERRNOTE_DEV_DATABASE_URL',
  'SCRIBERRNOTE_DEV_DIRECT_URL'
];

const vercelVars = [
  'VERCEL_ENV',
  'VERCEL_URL',
  'VERCEL_GIT_COMMIT_REF'
];

console.log('\n📋 Required Shopify Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const display = value ? (value.length > 20 ? value.substring(0, 20) + '...' : value) : 'NOT SET';
  console.log(`${status} ${varName}: ${display}`);
});

console.log('\n🗄️ Database Variables:');
databaseVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  console.log(`${status} ${varName}: ${value ? 'SET' : 'NOT SET'}`);
});

console.log('\n☁️ Vercel Variables:');
vercelVars.forEach(varName => {
  const value = process.env[varName];
  console.log(`📍 ${varName}: ${value || 'NOT SET'}`);
});

console.log('\n🔧 Environment Detection:');
const isDevEnvironment = process.env.VERCEL_ENV === 'development' || 
                         process.env.VERCEL_GIT_COMMIT_REF === 'dev' ||
                         process.env.VERCEL_URL?.includes('scriberrdev');
console.log(`📍 Is Dev Environment: ${isDevEnvironment}`);

// Check for common misconfigurations
console.log('\n⚠️ Common Issues:');
if (!process.env.SHOPIFY_API_KEY) {
  console.log('❌ SHOPIFY_API_KEY is missing - this will cause authentication failures');
}
if (!process.env.SHOPIFY_API_SECRET && !process.env.SHOPIFY_API_SECRET_KEY) {
  console.log('❌ SHOPIFY_API_SECRET or SHOPIFY_API_SECRET_KEY is missing');
}
if (!process.env.SHOPIFY_APP_URL && !process.env.APP_URL) {
  console.log('❌ SHOPIFY_APP_URL or APP_URL is missing - app won\'t load in Shopify');
}

const appUrl = process.env.SHOPIFY_APP_URL || process.env.APP_URL;
if (appUrl && !appUrl.includes('scriberrdev') && isDevEnvironment) {
  console.log(`⚠️ App URL (${appUrl}) doesn't match dev environment`);
}

console.log('\n✅ Environment check complete!');