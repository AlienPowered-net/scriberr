#!/bin/bash
# Deploy dev configuration to Shopify
# This script helps deploy the ScriberrDEV app configuration

echo "🔧 Deploying ScriberrDEV app configuration..."

# Check if shopify CLI is available
if ! command -v shopify &> /dev/null; then
    echo "❌ Shopify CLI not found. Please install it first:"
    echo "   npm install -g @shopify/cli @shopify/theme"
    exit 1
fi

echo "📋 Available configurations:"
ls -la shopify.app*.toml

echo ""
echo "🚀 Using ScriberrDEV configuration..."

# Use the scriberrdev configuration
shopify app config use scriberrdev

echo "📤 Deploying configuration..."
shopify app deploy

echo "✅ Configuration deployed!"
echo ""
echo "🔍 Verify your ScriberrDEV app now has:"
echo "   - App URL: https://scriberrdev.vercel.app"
echo "   - Redirect URLs: https://scriberrdev.vercel.app/auth/callback"
echo "   - Client ID: 4444a58754e272c8a2aeba645e247b56"