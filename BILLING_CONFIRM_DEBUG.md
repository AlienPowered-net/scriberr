# Billing Confirmation Debug Guide

## Changes Made

### 1. Enhanced Logging Throughout the Confirmation Flow

**In `app/routes/api.billing.confirm.ts`:**
- ✅ Log all incoming URL parameters to see exactly what Shopify sends
- ✅ Log extracted shop and charge_id values
- ✅ Log subscription GID construction
- ✅ Log successful subscription fetch with key details
- ✅ Added detailed GraphQL request logging in custom offline admin client

**In `src/lib/shopify/billing.ts`:**
- ✅ Log HTTP response status before parsing JSON
- ✅ Log parsed response structure
- ✅ Better error messages that distinguish between HTTP, JSON, and GraphQL errors
- ✅ Log full payload when appSubscription is missing

### 2. Parameter Handling Improvements

The confirm route now checks for subscription ID in multiple parameter names:
- `charge_id` (primary - what Shopify sends for appSubscriptionCreate)
- `subscription` (fallback)
- `id` (fallback - for GID format)

### 3. Fixed Potential Issues

- Fixed TypeScript linting error for `appSubscription` query field
- Improved JSON parsing error handling
- Better error messages for debugging

## What to Look For in Logs

When testing the billing flow, you should now see these log entries:

### 1. On Billing Confirm Request
```
[Billing Confirm] Incoming request: {
  fullUrl: 'https://...',
  allParams: { shop: '...', charge_id: '...' }
}
```

### 2. Parameter Extraction
```
[Billing Confirm] Extracted parameters: {
  shop: 'dev-alienpowered.myshopify.com',
  chargeId: '12345678',
  isGid: false
}
```

### 3. Offline Admin Client Creation
```
[Billing Confirm] Using offline admin GraphQL client for billing confirmation {
  shop: 'dev-alienpowered.myshopify.com',
  apiVersion: '2025-01'
}
```

### 4. Subscription Fetch
```
[Billing Confirm] Fetching subscription: {
  originalChargeId: '12345678',
  subscriptionGid: 'gid://shopify/AppSubscription/12345678',
  shop: 'dev-alienpowered.myshopify.com'
}
```

### 5. GraphQL Request
```
[Billing Confirm] Making GraphQL request: {
  endpoint: 'https://dev-alienpowered.myshopify.com/admin/api/2025-01/graphql.json',
  hasVariables: true,
  variables: { id: 'gid://shopify/AppSubscription/12345678' }
}
```

### 6. HTTP Response
```
[Billing Confirm] GraphQL response status: {
  status: 200,
  ok: true,
  statusText: 'OK'
}
```

### 7. Parsed Response
```
[Billing Confirm] fetchSubscription parsed response: {
  hasData: true,
  hasErrors: false,
  errors: undefined,
  appSubscriptionExists: true
}
```

### 8. Successful Fetch
```
[Billing Confirm] Subscription fetched successfully: {
  id: 'gid://shopify/AppSubscription/12345678',
  status: 'ACTIVE',
  name: 'Scriberr Pro – $5/month',
  priceAmount: 5,
  currencyCode: 'USD',
  test: true
}
```

## Common Issues and What Logs Will Show

### Issue: Missing subscription ID in URL
**Logs:**
```
[Billing Confirm] Missing charge identifier in URL params
```
**Solution:** Check that Shopify is redirecting with the correct parameters. The returnUrl in billing creation should match the actual redirect.

### Issue: GraphQL Authentication Failure
**Logs:**
```
[Billing Confirm] HTTP response status: { status: 401, ok: false }
```
**Solution:** Offline session token may be invalid or expired. Check the session storage.

### Issue: GraphQL Errors
**Logs:**
```
[Billing Confirm] GraphQL errors when loading subscription: [...]
```
**Solution:** Check the error message for specifics. Common issues:
- Invalid subscription GID format
- Subscription doesn't exist
- App doesn't have billing permissions

### Issue: No appSubscription in Response
**Logs:**
```
[Billing Confirm] No appSubscription returned in response: {
  fullData: { ... },
  fullPayload: { ... }
}
```
**Solution:** The subscription ID may be incorrect, or it hasn't been created yet. Check the GID construction.

## Testing Steps

1. Navigate to the billing upgrade page in the app
2. Click the "Upgrade to Pro" button
3. Approve the charge in Shopify
4. Watch the server logs for the sequence above
5. Verify you're redirected to the success page
6. Check that the plan is marked as PRO in the database

## Next Steps After Logs Review

Once we see the actual log output from a billing attempt, we'll know:
1. What parameters Shopify is actually sending
2. Whether the GraphQL request is being made correctly
3. What response (or error) we're getting from Shopify
4. Where exactly in the flow it's failing

Then we can make targeted fixes based on the actual behavior.

