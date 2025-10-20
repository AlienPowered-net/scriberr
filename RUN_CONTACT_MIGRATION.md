# 🔧 Contact Migration Instructions

## Current Status
✅ **TEMPORARY FIX APPLIED**: Contacts now work, but `address` and `notes` fields are temporarily disabled.

## What Happened
The `address` and `notes` fields were added to the code but the database columns don't exist yet. To prevent errors, these fields have been temporarily disabled (commented out in the code).

## What to Do Next
When you're ready to enable address and notes fields, run the migration to add these columns to your production database.

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

1. Check the console output - you should see `success: true`
2. **IMPORTANT**: You need to uncomment the fields in the code (see below)

## After Migration: Re-enable the Fields

Once the migration succeeds, you need to uncomment the fields in these files:

### 1. `prisma/schema.prisma`
Find and uncomment these lines (around line 149-151):
```prisma
// TODO: Uncomment after running migration
// address   String? @db.Text
// notes     String? @db.Text
```

Should become:
```prisma
address   String? @db.Text
notes     String? @db.Text
```

### 2. `app/routes/api.contacts.jsx`
Find and uncomment these lines in **4 places** (search for "TODO: Uncomment after migration"):

```javascript
// const address = formData.get("address"); // TODO: Uncomment after migration
// const notes = formData.get("notes"); // TODO: Uncomment after migration
```

And:
```javascript
// ...(address && { address }), // TODO: Uncomment after migration
// ...(notes && { notes }), // TODO: Uncomment after migration
```

### 3. Commit and push the changes
```bash
git add -A
git commit -m "feat: re-enable address and notes fields after migration"
git push origin labs
```

## What This Does

The migration adds two new TEXT columns to the Contact table:
- `address` - For storing contact addresses
- `notes` - For storing additional notes about contacts

## Troubleshooting

If you see `"All migrations already applied"`, the migration has already run successfully.

If you see an error, check the Vercel logs for detailed error messages.

