# 🔧 Contact Migration Instructions

## Issue
The production database is missing the `address` and `notes` columns in the `Contact` table, causing "Failed to process request" errors when creating or updating contacts.

## Solution
Run the database migration to add these columns to your production database.

## How to Run the Migration

### Option 1: Using the Shopify Admin (Recommended)

1. **Open your Shopify Admin** for your store
2. **Navigate to Apps** → **Scriberr Labs**
3. **Open the browser's Developer Tools** (F12 or Right-click → Inspect)
4. **Go to the Console tab**
5. **Paste this code and press Enter:**

```javascript
fetch('/api/apply-migration', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}).then(r => r.json()).then(d => console.log(d));
```

6. **Check the console output** - you should see:
   - `success: true`
   - `message: "Migration applied successfully! Applied: contact columns (address, notes)"`

### Option 2: Using curl (Terminal/Command Line)

Replace `YOUR_APP_URL` with your Vercel deployment URL:

```bash
curl -X POST https://YOUR_APP_URL/api/apply-migration
```

### Option 3: Using a REST Client (Postman, Insomnia, etc.)

- **Method**: POST
- **URL**: `https://YOUR_APP_URL/api/apply-migration`
- **Headers**: None required (authentication is handled by Shopify session)

## Verification

After running the migration:

1. Try creating a new contact
2. The error should be gone
3. Address and Notes fields should now save correctly

## What This Does

The migration adds two new TEXT columns to the Contact table:
- `address` - For storing contact addresses
- `notes` - For storing additional notes about contacts

## Troubleshooting

If you see `"All migrations already applied"`, the migration has already run successfully.

If you see an error, check the Vercel logs for detailed error messages.

