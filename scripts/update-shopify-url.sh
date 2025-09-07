#!/bin/bash
# Update Shopify configuration with current Vercel URL

echo "🔍 Getting current Vercel deployment URL..."

# Get the current Vercel URL from the domain check endpoint
VERCEL_URL=$(curl -s https://scriberrdev.vercel.app/domain-check | grep -o '"VERCEL_URL": "[^"]*' | cut -d'"' -f4)

if [ -z "$VERCEL_URL" ]; then
    echo "❌ Could not get Vercel URL. Please check manually:"
    echo "   Visit: https://scriberrdev.vercel.app/domain-check"
    echo "   Look for VERCEL_URL value"
    exit 1
fi

FULL_URL="https://$VERCEL_URL"
echo "📍 Current Vercel URL: $FULL_URL"

echo "🔧 Updating shopify.app.scriberrdev.toml..."

# Update the TOML file with the current URL
sed -i.bak "s|application_url = \"https://.*\"|application_url = \"$FULL_URL\"|" shopify.app.scriberrdev.toml
sed -i.bak "s|https://[^/]*/auth/callback|$FULL_URL/auth/callback|g" shopify.app.scriberrdev.toml
sed -i.bak "s|https://[^/]*/auth/shopify/callback|$FULL_URL/auth/shopify/callback|g" shopify.app.scriberrdev.toml  
sed -i.bak "s|https://[^/]*/api/auth/callback|$FULL_URL/api/auth/callback|g" shopify.app.scriberrdev.toml

echo "✅ Configuration updated!"

echo "🚀 Now run: shopify app deploy -c scriberrdev"
echo "📱 Then test your ScriberrDEV app in Shopify admin"