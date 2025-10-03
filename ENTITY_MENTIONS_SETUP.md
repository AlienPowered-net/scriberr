# Enhanced Entity Mentions Setup Guide

## Overview
Your Scriberr app now supports universal @ mentions for linking to important items in Shopify Admin. Users can type `@` to mention:

- **Products** - Link to product pages in Shopify Admin
- **Product Variants/SKUs** - Link to specific variant pages
- **Orders** - Link to order detail pages
- **Customers** - Link to customer profiles
- **Collections** - Link to collection pages
- **Discounts** - Link to discount code pages
- **Draft Orders** - Link to draft order pages
- **People** - Link to team members (existing functionality)

## What Was Added

### New Files Created
1. **`app/routes/api.shopify-entities.jsx`** - API endpoint that fetches Shopify entities via GraphQL
2. **`app/components/EntityMention.js`** - Custom TipTap extension for entity mentions with hyperlinks

### Files Modified
1. **`app/components/NotionTiptapEditor.jsx`** - Updated to use the new EntityMention extension
2. **`app/components/NotionTiptapEditor.css`** - Added entity mention styling with type-specific colors
3. **`shopify.app.toml`** - Updated scopes to include entity access permissions

## Features

### Intelligent Search
- Type `@` followed by any text to search across all entity types
- Search by product name, SKU, order number, customer name, email, etc.
- Results are grouped by category (Products, Orders, Customers, etc.)

### Visual Badges
Each entity type has a unique colored badge:
- 📦 **Products** - Blue
- 🔹 **Variants** - Purple
- 🛒 **Orders** - Orange
- 👤 **Customers** - Green
- 📚 **Collections** - Pink
- 🏷️ **Discounts** - Yellow
- 📝 **Draft Orders** - Light Green
- 👨‍💼 **People** - Teal

### Clickable Links
All entity mentions are hyperlinks that open the corresponding page in Shopify Admin in a new tab.

### Metadata Preview
The suggestion dropdown shows helpful metadata:
- Products: Handle, Status
- Variants: SKU
- Orders: Customer, Financial Status
- Customers: Email, Number of Orders
- Collections: Product Count
- Discounts: Discount Code
- Draft Orders: Customer, Status

## Activating Required Shopify Scopes

### Using Shopify CLI (Recommended)

The scopes have been updated in `shopify.app.toml`. To deploy these changes:

1. **Install/Update Shopify CLI** (if not already installed):
   ```bash
   npm install -g @shopify/cli@latest
   ```

2. **Authenticate with Shopify**:
   ```bash
   shopify auth login
   ```

3. **Deploy the app with new scopes**:
   ```bash
   shopify app deploy
   ```

   This command will:
   - Create a new app version with the updated scopes
   - Generate extension IDs if needed
   - Push the configuration to Shopify Partners

4. **Test the new version**:
   ```bash
   shopify app dev
   ```

5. **Release the version** (when ready):
   - Go to your [Shopify Partners Dashboard](https://partners.shopify.com/)
   - Navigate to your app
   - Go to "Versions" section
   - Find the version you just deployed
   - Click "Release" to make it available to users

### What the Deploy Process Does

When you run `shopify app deploy`:
- Reads the updated scopes from `shopify.app.toml`
- Creates a new app version in the Shopify Partners dashboard
- Updates the app configuration including:
  - Required scopes: `read_products`, `read_orders`, `read_customers`, `read_discounts`, `read_draft_orders`
  - Webhook subscriptions (if any)
  - Extension configurations

### After Deployment

#### For Existing Installations
Merchants who already have your app installed will see a notification to approve the new scopes. They must:
1. Go to their Shopify Admin
2. Navigate to Apps
3. Click on your app name
4. Approve the new permissions

#### For New Installations
New installations will automatically request all the updated scopes during installation.

### Verifying Scope Access

You can verify the scopes are working by:

1. **Check the Session Object**:
   In your app's authenticated routes, the session will contain the approved scopes:
   ```javascript
   const { session } = await shopify.authenticate.admin(request);
   console.log(session.scope); // Should include all the new scopes
   ```

2. **Test API Calls**:
   Try accessing the new endpoint:
   ```bash
   curl https://your-app-url.com/api/shopify-entities?query=test
   ```

3. **Use the Editor**:
   - Open any note in Scriberr
   - Type `@` in the editor
   - You should see products, orders, customers, etc. appear in the suggestions

## Updated Scopes

The following scopes are now required:

```
read_products       # Access to products and variants
read_orders         # Access to orders
read_customers      # Access to customer information
read_discounts      # Access to discount codes
read_draft_orders   # Access to draft orders
```

These are **read-only** scopes, ensuring the app can fetch entity data but cannot modify any store information through the entity mentions feature.

## Troubleshooting

### "Permission denied" errors
- Ensure you've run `shopify app deploy` to update the app configuration
- Verify the scopes are properly listed in `shopify.app.toml`
- Check that merchants have approved the new scope requests

### No entities showing in mentions
- Verify the API endpoint is accessible: `/api/shopify-entities`
- Check browser console for any errors
- Ensure the Shopify session is authenticated
- Verify the merchant has data (products, orders, etc.) in their store

### Scope update not appearing in Partners Dashboard
- Make sure you're using Shopify CLI version 3.84.1 or higher
- Try running `shopify app config push` to force push the configuration
- Check that you're authenticated to the correct Partners account

### CLI Commands Reference

```bash
# Check CLI version
shopify version

# Login to Partners account
shopify auth login

# Deploy app with new configuration
shopify app deploy

# Start development server
shopify app dev

# Push configuration without deploying
shopify app config push

# View app info
shopify app info
```

## API Endpoint Documentation

### GET `/api/shopify-entities`

**Query Parameters:**
- `query` (string, optional): Search term to filter entities
- `type` (string, optional): Filter by entity type (products, orders, customers, collections, discounts, draftOrders, all)

**Response:**
```json
{
  "success": true,
  "results": {
    "products": [...],
    "orders": [...],
    "customers": [...],
    "collections": [...],
    "discounts": [...],
    "draftOrders": [...]
  }
}
```

## User Experience

### How Merchants Will Use It

1. **Writing a Note**:
   ```
   Follow up on @John Doe regarding @Order #1001 for @Premium Widget
   ```

2. **Result**:
   - "John Doe" links to the team member
   - "#1001" links to the order in Shopify Admin
   - "Premium Widget" links to the product in Shopify Admin

3. **Benefits**:
   - Quick access to related Shopify resources
   - Contextual information without leaving notes
   - Better organization and connection of data

## Security Considerations

- All entity mentions use read-only scopes
- Links open in new tabs to prevent navigation loss
- No sensitive data is stored in the note content (only IDs and labels)
- Proper authentication required for API access

## Future Enhancements

Potential additions:
- **Inline previews**: Hover over a mention to see a preview card
- **Recent items**: Show recently accessed items at the top
- **Favorites**: Pin frequently mentioned items
- **Bulk mentions**: Mention multiple items at once
- **Analytics**: Track which entities are mentioned most

## Support

If you encounter any issues:
1. Check this documentation
2. Review the Shopify CLI documentation: https://shopify.dev/docs/apps/tools/cli
3. Check the [Shopify Partners Dashboard](https://partners.shopify.com/) for scope approval status
4. Verify your app version in the Partners dashboard

---

**Last Updated**: October 3, 2025
**Version**: 1.0.0
**Requires**: Shopify CLI 3.84.1+
