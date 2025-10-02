# How to Add read_users Scope to Scriberr App

## The Problem
The app currently only has `write_products` scope. To access staff members from Shopify, we need the `read_users` scope.

## Solution: Update Scopes in Shopify Partners Dashboard

### Step 1: Go to Shopify Partners
1. Visit https://partners.shopify.com
2. Click on **Apps** in the left sidebar
3. Find and click on **Scriberr**

### Step 2: Update API Scopes
1. Click on **Configuration** tab
2. Scroll to **App API access scopes** section
3. Look for **Admin API access scopes**
4. Add the following scopes:
   - ✅ `write_products` (already there)
   - ✅ `read_users` (ADD THIS)

### Step 3: Save and Deploy
1. Click **Save** at the bottom
2. The changes may take a few minutes to propagate

### Step 4: Reinstall on Test Store
1. Go to your development store
2. Uninstall Scriberr
3. Reinstall Scriberr
4. You should see a prompt asking to approve **"Read users and staff"** permission
5. Approve the new permission

### Step 5: Verify
1. Visit `/app/debug-mentions` in Scriberr
2. Check that the scope shows: `write_products,read_users`
3. Add staff members in Shopify Admin → Settings → Users and permissions
4. Refresh the debug page - staff should appear!

---

## Alternative: Use Custom Mentions (Works Immediately!)

If you don't want to deal with Shopify scopes, you can use Custom Mentions:

1. Go to **Settings → Custom Mentions** in Scriberr
2. Click **"Add Person"**
3. Add anyone you want:
   - Team members
   - Clients
   - Suppliers
   - Anyone!
4. Type `@` in the editor - they'll appear immediately

**Benefits:**
- ✅ No scope changes needed
- ✅ Works instantly
- ✅ You control who's in the list
- ✅ Can add people who aren't Shopify staff

---

## Troubleshooting

### Q: I updated the scope in Partners but it's not showing
**A:** Try these steps:
1. Clear browser cache
2. Uninstall app completely from test store
3. Wait 5 minutes
4. Reinstall from Partners dashboard test link
5. Check debug page again

### Q: I don't see the scope update option in Partners
**A:** Make sure you're:
- Logged into the correct Partners account
- Looking at the right app
- In the Configuration (not Overview) section
- Have permission to edit the app settings

### Q: The permission prompt didn't show during reinstall
**A:** This can happen if:
- The scope didn't save properly in Partners
- Browser cached the old permission set
- Try in incognito/private browsing mode

---

## For Development Environment

If you're testing locally with `npm run dev`:

1. Stop the dev server
2. Run: `npm run dev`
3. The Shopify CLI will detect scope changes
4. Follow the prompts to update installation
5. Approve the new `read_users` scope

---

## What read_users Scope Provides

With this scope, you can access:
- Staff member names
- Staff member emails
- Shop owner identification
- Active/inactive status
- All staff on the plan (5 staff on Grow plan, etc.)

Without this scope, you can only:
- See the current logged-in user
- Use Custom Mentions (which works great!)
