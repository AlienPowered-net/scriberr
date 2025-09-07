#!/usr/bin/env node
/**
 * Sync current Vercel deployment URL to Shopify CLI
 * This script gets the current Vercel URL and updates Shopify configuration
 */

import { execSync } from 'child_process';

console.log('🔍 Getting current Vercel deployment URL...');

try {
  // Get current Vercel URL from environment check
  const response = await fetch('https://scriberrdev.vercel.app/domain-check');
  const data = await response.json();
  
  const vercelUrl = data.environment.VERCEL_URL;
  
  if (!vercelUrl) {
    throw new Error('Could not find VERCEL_URL from domain check');
  }
  
  const fullUrl = `https://${vercelUrl}`;
  console.log('📍 Current Vercel URL:', fullUrl);
  
  // Run Shopify CLI with the tunnel URL
  console.log('🚀 Updating Shopify configuration...');
  const command = `shopify app dev --store=dev-alienpowered --tunnel-url=${fullUrl}`;
  
  console.log('💻 Running command:', command);
  console.log('📋 You can run this manually:');
  console.log(`   ${command}`);
  
  // Don't auto-execute to avoid conflicts, just show the command
  console.log('');
  console.log('✅ Copy and run the command above to sync your Vercel deployment with Shopify!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('');
  console.log('🔧 Manual steps:');
  console.log('1. Get current Vercel URL from your deployment');
  console.log('2. Run: shopify app dev --store=dev-alienpowered --tunnel-url=https://YOUR-VERCEL-URL');
}