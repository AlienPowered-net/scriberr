# Entity Mention Bubble Menu Implementation

## Feature Overview
Implemented an interactive bubble menu that appears when users click on entity mentions (products, customers, orders, etc.) in the Tiptap editor. The bubble menu displays a preview of the entity and provides a direct link to open the item in Shopify Admin.

## What Was Implemented

### 1. **EntityMention.js Updates**
- Changed `selectable` from `false` to `true` to allow users to click on entity mentions
- Updated `renderHTML` to make all entity mentions clickable with a pointer cursor
- Removed hardcoded `onclick` window.open in favor of centralized handling

### 2. **NotionTiptapEditor.jsx Updates**
- Added `selectedEntityMention` state to track which entity is clicked
- Implemented `handleClick` in `editorProps` to detect clicks on entity mentions
- Added a new BubbleMenu component that shows:
  - Entity icon and name
  - Metadata preview (SKU, status, email, order count, etc.)
  - "Open in Shopify Admin" button that opens the entity URL in a new tab
  - "Close" button to dismiss the bubble menu
- Added CSS styling for the entity mention bubble menu

### 3. **AdvancedRTE.jsx Updates**
- Added `selectedEntityMention` state
- Implemented the same `handleClick` logic in `editorProps`
- Added the same BubbleMenu component for entity mention previews
- Both normal and expanded editor modes share the same bubble menu functionality

### 4. **NotionTiptapEditor.css Updates**
- Added `.entity-mention-bubble-menu` styles
- Styled the bubble menu card with proper shadows and borders
- Added hover effects for buttons in the bubble menu

## How It Works

1. **User clicks on any entity mention** (product, customer, order, etc.)
2. **Click handler detects the entity mention node** and extracts its attributes (id, label, type, url, metadata)
3. **Bubble menu appears above the mention** showing:
   - Entity-specific icon (📦 for products, 👤 for customers, 🛒 for orders, etc.)
   - Entity name
   - Relevant metadata (based on entity type)
4. **User can click "Open in Shopify Admin"** to view the entity in a new tab
5. **User can click "Close"** or click elsewhere to dismiss the bubble menu

## Entity Types Supported

All entity types with preview capabilities:
- **Products** - Shows handle and status
- **Product Variants** - Shows SKU
- **Orders** - Shows customer name and financial status
- **Customers** - Shows email and number of orders
- **Collections** - Shows product count
- **Discounts** - Shows discount code and status
- **Draft Orders** - Shows customer and status
- **Custom People** - Shows email

## Files Modified
1. `/workspace/app/components/EntityMention.js` - Made mentions selectable
2. `/workspace/app/components/NotionTiptapEditor.jsx` - Added bubble menu and click handler
3. `/workspace/app/components/AdvancedRTE.jsx` - Added bubble menu and click handler
4. `/workspace/app/components/NotionTiptapEditor.css` - Added bubble menu styles

## User Experience Flow

```
User types @ → Select entity → Entity appears as colored badge → 
User clicks badge → Bubble menu appears → User clicks "Open in Shopify Admin" → 
Opens in new tab with direct link to Shopify Admin
```

## Technical Details

- Uses Tiptap's `BubbleMenu` component for positioning
- Click detection via `handleClick` in `editorProps`
- State management with React hooks (`selectedEntityMention`)
- URL handling via `window.open(url, '_blank')`
- Shopify Admin URLs are pre-generated in the `/api/shopify-entities` endpoint
- Z-index set to 10001 to appear above other UI elements
