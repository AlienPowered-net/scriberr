# Shopify CLI Configuration Deployment Guide

## Problem
The ScriberrDEV app shows "Something went wrong" because the Shopify CLI configuration hasn't been deployed to update the app's settings in Shopify's system.

## Solution Steps

### 1. Install Shopify CLI (if not already installed)
```bash
npm install -g @shopify/cli @shopify/theme
```

### 2. Navigate to Project Directory
```bash
cd /path/to/scriberr
```

### 3. Link to ScriberrDEV App Configuration
```bash
# Use the dev configuration file
shopify app config use scriberrdev
```

### 4. Deploy Configuration
```bash
# Deploy the configuration to Shopify
shopify app deploy
```

### 5. Verify Deployment
After deployment, the ScriberrDEV app should have:
- **App URL**: `https://scriberrdev.vercel.app`
- **Redirect URLs**: 
  - `https://scriberrdev.vercel.app/auth/callback`
  - `https://scriberrdev.vercel.app/auth/shopify/callback`
  - `https://scriberrdev.vercel.app/api/auth/callback`

## Alternative: Manual Configuration Check

If CLI deployment doesn't work, you can verify the current configuration:

```bash
# Check current configuration
shopify app info

# List available configurations
ls -la shopify.app*.toml

# Check which config is active
shopify app config list
```

## Testing After Deployment

1. **Test Authentication**: Visit `https://scriberrdev.vercel.app/test-auth`
2. **Test Health Check**: Visit `https://scriberrdev.vercel.app/api/health`
3. **Test in Shopify Admin**: Try accessing the ScriberrDEV app

## Configuration Files

### Production (shopify.app.toml)
- **Client ID**: `6bce6b128d5d19d33686b60d41c92824`
- **App URL**: `https://scriberr.vercel.app`

### Development (shopify.app.scriberrdev.toml)
- **Client ID**: `4444a58754e272c8a2aeba645e247b56`
- **App URL**: `https://scriberrdev.vercel.app`

## Troubleshooting

If the issue persists after CLI deployment:

1. **Check Environment Variables**: Ensure `SHOPIFY_API_KEY` matches the client_id in `shopify.app.scriberrdev.toml`
2. **Reinstall App**: Uninstall and reinstall the ScriberrDEV app on your dev store
3. **Clear Browser Cache**: Clear cookies and cache for your dev store
4. **Check Vercel Logs**: Look for authentication errors in Vercel function logs

## Success Indicators

The app is properly configured when:
- ✅ `/test-auth` shows "Authentication successful"
- ✅ `/api/health` returns status "ok"
- ✅ App loads without "Something went wrong" error in Shopify admin