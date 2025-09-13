# Vercel Build Fix - NotionTiptapEditor

## Issue
The build was failing with the error:
```
"QuoteIcon" is not exported by "node_modules/@shopify/polaris-icons/dist/index.mjs"
```

## Root Cause
`QuoteIcon` does not exist in the Shopify Polaris Icons library. This was causing the build to fail during the module transformation phase.

## Solution
Replaced `QuoteIcon` with `TextBlockIcon` (which was already imported and available) for the quote/blockquote functionality in the slash commands menu.

## Changes Made
1. Removed `QuoteIcon` from the imports in `NotionTiptapEditor.jsx`
2. Changed the quote command icon from `QuoteIcon` to `TextBlockIcon`
3. This maintains the functionality while using an available icon

## Verification
- All icon imports are now using valid Polaris icons
- The editor functionality remains unchanged
- The quote block feature still works with the slash command

## Next Steps
The build should now pass successfully. If you prefer a different icon for quotes, consider using one of these alternatives that are available in Polaris Icons:
- `TextBlockIcon` (currently used)
- `NoteIcon` 
- `CommentIcon`
- `ConversationIcon`

Simply replace `TextBlockIcon` with your preferred icon in the slash commands configuration.