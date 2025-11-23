# Shopify Billing Testing Guide

This guide provides step-by-step instructions for testing the complete billing implementation on a Shopify development store.

## Prerequisites

1. A Shopify development store
2. The Scriberr Labs app installed on the development store
3. Access to the database to verify plan changes
4. Access to Shopify admin to manage subscriptions

## Test Environments

- **Labs**: `https://scriberr-git-labs-alienpowered.vercel.app`
- **Production**: `https://getscriberr.app` (test after labs validation)

## Testing Checklist

### 1. Fresh Install Flow

**Goal**: Verify new installations start on FREE plan with proper limits

**Steps**:
1. Install the Scriberr Labs app on a fresh development store
2. Open the app and navigate to Settings
3. Verify the UI shows "Free Plan" as current plan

**Database Verification**:
```sql
SELECT domain, plan, installedAt FROM "Shop" WHERE domain = 'your-dev-store.myshopify.com';
```
Expected: `plan = 'FREE'`

**Feature Verification**:
- ✅ Can create up to 25 notes
- ✅ Can create up to 3 folders
- ✅ Note versions limited to 5 per note
- ✅ Contacts tab NOT visible in navigation
- ✅ Tags feature disabled on notes
- ✅ Settings page shows usage meters (X/25 notes, X/3 folders)

**Test Edge Cases**:
- Try to create 26th note → should see error: "Free plan allows up to 25 notes. Delete a note or upgrade to Pro."
- Try to create 4th folder → should see error: "Free plan allows up to 3 folders. Delete a folder or upgrade to Pro."

---

### 2. Upgrade to Pro Flow

**Goal**: Test the complete upgrade journey from FREE to PRO

**Steps**:
1. From Settings page, click "Upgrade now" button on Pro Plan card
2. You should be redirected to Shopify's subscription confirmation page
3. Verify the charge details:
   - Name: "Scriberr Pro Plan"
   - Amount: $5.00 USD
   - Billing frequency: Every 30 days
   - Test mode indicator should be visible
4. Click "Approve" on Shopify's confirmation page
5. You should be redirected back to the app at `/app/settings/billing/success`
6. Verify success page shows: "You're on Scriberr Pro!"

**Database Verification After Approval**:
```sql
-- Check shop plan
SELECT domain, plan FROM "Shop" WHERE domain = 'your-dev-store.myshopify.com';

-- Check subscription record
SELECT s.status, s.shopifySubGid, s.name, s.priceAmount, s.currency, s.testMode
FROM "Subscription" s
JOIN "Shop" sh ON s.shopId = sh.id
WHERE sh.domain = 'your-dev-store.myshopify.com';
```

Expected Results:
- Shop.plan = 'PRO'
- Subscription.status = 'ACTIVE'
- Subscription.priceAmount = 5.00
- Subscription.currency = 'USD'
- Subscription.testMode = true (for labs environment)

**Feature Verification**:
- ✅ Navigate to Settings → Plan shows "Pro Plan" with "Your current plan" button
- ✅ Contacts tab NOW visible in navigation
- ✅ Can create unlimited notes (test creating 30+ notes)
- ✅ Can create unlimited folders (test creating 5+ folders)
- ✅ Tags feature enabled on notes
- ✅ Can access Contacts page
- ✅ Version history unlimited
- ✅ Usage meters no longer visible (or show "unlimited")

**Network Verification**:
Open browser DevTools Network tab and verify:
1. `/api/billing/create` returns 200 with `confirmationUrl`
2. After approval, `/api/billing/confirm?charge_id=XXX` returns redirect to success page
3. No errors in console

---

### 3. Subscription Cancellation Flow

**Goal**: Verify the app properly downgrades to FREE when subscription is cancelled

**Steps**:
1. Go to Shopify Admin: Settings → Apps and sales channels → Scriberr Labs
2. Click "Manage app" or view billing
3. Cancel the app subscription
4. Wait 1-2 minutes for webhook delivery

**Database Verification After Cancellation**:
```sql
-- Check shop plan (should revert to FREE)
SELECT domain, plan FROM "Shop" WHERE domain = 'your-dev-store.myshopify.com';

-- Check subscription status (should be CANCELED)
SELECT s.status, s.shopifySubGid
FROM "Subscription" s
JOIN "Shop" sh ON s.shopId = sh.id
WHERE sh.domain = 'your-dev-store.myshopify.com';
```

Expected Results:
- Shop.plan = 'FREE'
- Subscription.status = 'CANCELED'

**Feature Verification**:
- ✅ Refresh the app (reload page)
- ✅ Settings page shows "Free Plan" as current plan
- ✅ Contacts tab hidden from navigation
- ✅ Tags feature disabled
- ✅ Usage meters reappear
- ✅ If you have > 25 notes, you cannot create more (but existing notes remain accessible)
- ✅ If you have > 3 folders, you cannot create more (but existing folders remain)

**Webhook Logs**:
Check server logs for webhook processing:
```
Received webhook: app_subscriptions/cancelled for shop: your-dev-store.myshopify.com
Downgraded shop your-dev-store.myshopify.com to FREE plan due to subscription cancellation
```

---

### 4. Re-subscription Flow

**Goal**: Verify merchants can upgrade again after cancellation

**Steps**:
1. After cancellation (shop is now on FREE plan)
2. Go to Settings page
3. Click "Upgrade now" again
4. Approve the new subscription
5. Verify plan upgrades back to PRO

**Database Verification**:
```sql
-- Should see plan = PRO again
SELECT domain, plan FROM "Shop" WHERE domain = 'your-dev-store.myshopify.com';

-- Should see new ACTIVE subscription (new shopifySubGid)
SELECT s.status, s.shopifySubGid, s.createdAt, s.updatedAt
FROM "Subscription" s
JOIN "Shop" sh ON s.shopId = sh.id
WHERE sh.domain = 'your-dev-store.myshopify.com'
ORDER BY s.updatedAt DESC;
```

Expected: New subscription record with status = 'ACTIVE', plan = 'PRO'

---

### 5. Webhook Testing (Manual Trigger)

If webhooks aren't firing automatically, you can manually test them:

**Update Webhook**:
```bash
curl -X POST https://scriberr-git-labs-alienpowered.vercel.app/webhooks/app_subscriptions/update \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: app_subscriptions/update" \
  -H "X-Shopify-Shop-Domain: your-dev-store.myshopify.com" \
  -d '{
    "app_subscription": {
      "admin_graphql_api_id": "gid://shopify/AppSubscription/12345678",
      "name": "Scriberr Pro Plan",
      "status": "ACTIVE"
    }
  }'
```

**Cancelled Webhook**:
```bash
curl -X POST https://scriberr-git-labs-alienpowered.vercel.app/webhooks/app_subscriptions/cancelled \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: app_subscriptions/cancelled" \
  -H "X-Shopify-Shop-Domain: your-dev-store.myshopify.com" \
  -d '{
    "app_subscription": {
      "admin_graphql_api_id": "gid://shopify/AppSubscription/12345678",
      "name": "Scriberr Pro Plan",
      "status": "CANCELLED"
    }
  }'
```

---

### 6. Edge Cases & Error Handling

**Test Pending Subscription**:
- Scenario: Merchant clicks "Approve" but Shopify marks subscription as PENDING
- Expected: Plan stays FREE until subscription becomes ACTIVE
- How to test: Check logs during approval process, ensure plan only upgrades for ACTIVE status

**Test Network Failure During Confirmation**:
- Scenario: Network fails during `/api/billing/confirm` request
- Expected: Shop can retry, no duplicate charges
- How to test: Simulate by closing browser during redirect, then accessing confirmation URL directly

**Test Webhook Delivery Failure**:
- Scenario: Webhook never arrives (network issue, etc.)
- Expected: Next time user opens the app, plan should sync
- Note: Current implementation relies on webhooks; consider adding sync-on-app-entry if needed

---

## Quick Verification Queries

Run these in your database client to get full billing status:

```sql
-- Full shop and subscription details
SELECT 
  sh.domain,
  sh.plan,
  sh.installedAt,
  s.status as subscription_status,
  s.shopifySubGid,
  s.priceAmount,
  s.currency,
  s.testMode,
  s.createdAt as subscription_created,
  s.updatedAt as subscription_updated
FROM "Shop" sh
LEFT JOIN "Subscription" s ON s.shopId = sh.id
WHERE sh.domain = 'your-dev-store.myshopify.com';

-- Count notes and folders for plan limit checking
SELECT 
  (SELECT COUNT(*) FROM "Note" WHERE "shopId" = sh.id) as note_count,
  (SELECT COUNT(*) FROM "Folder" WHERE "shopId" = sh.id) as folder_count
FROM "Shop" sh
WHERE sh.domain = 'your-dev-store.myshopify.com';
```

---

## Success Criteria

All tests pass when:

✅ **Fresh Install**: New stores start on FREE with all limits enforced
✅ **Upgrade Flow**: Clicking "Upgrade" → Shopify confirmation → Approval → Plan becomes PRO
✅ **Feature Gating**: FREE limits enforced, PRO unlocks all features
✅ **Cancellation**: Cancelled subscriptions downgrade to FREE automatically via webhook
✅ **Re-subscription**: Can upgrade again after cancellation
✅ **Database Consistency**: Shop.plan and Subscription.status always in sync
✅ **UI Consistency**: Settings page always reflects current plan accurately
✅ **Error Handling**: Clear error messages when limits exceeded

---

## Troubleshooting

### Problem: Plan shows PRO but Contacts tab not visible
**Solution**: Hard refresh the page (Ctrl+Shift+R). Check that `flags.contactsEnabled` is true in the app loader.

### Problem: Webhooks not firing
**Solution**: 
1. Check Shopify CLI is running and webhooks are registered
2. Run `shopify app webhooks trigger` to manually send webhooks
3. Check Vercel/server logs for incoming webhook requests

### Problem: Subscription shows ACTIVE but plan is FREE
**Solution**: 
1. Check the subscription amount/currency match ($5 USD)
2. Verify `/api/billing/confirm` validation logic
3. Manually update: `UPDATE "Shop" SET plan = 'PRO' WHERE domain = 'your-store.myshopify.com';`

### Problem: Cannot create subscription (error on approval)
**Solution**:
1. Verify `NEXT_PUBLIC_APP_URL` is set correctly
2. Check that return URL is allowlisted in Shopify app settings
3. Ensure test mode is enabled for development stores

---

## After Testing is Complete

1. ✅ All test cases pass on labs environment
2. ✅ No errors in browser console or server logs
3. ✅ Database queries show correct plan/subscription states
4. ✅ Ready to merge labs → main for production deployment

---

## Production Testing Checklist

Before deploying to main/production:

- [ ] All labs tests passed
- [ ] Version number updated (`node scripts/increment-version.js`)
- [ ] Webhooks registered in production Shopify app
- [ ] `SHOPIFY_BILLING_TEST_MODE=false` in production env vars
- [ ] Test with a real development store on production app
- [ ] Monitor first few production upgrades closely
- [ ] Have rollback plan ready

---

**Last Updated**: Implementation Date
**Environment**: Scriberr Labs
**Tester**: _____________

