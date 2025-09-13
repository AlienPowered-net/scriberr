# Notion-like Tiptap Editor Integration Guide

## Overview

A custom Notion-inspired text editor built with Tiptap v3 and Shopify Polaris, featuring AI content generation with the magic theme.

## Features

- ✨ **Notion-like UI**: Clean, minimal interface inspired by Notion
- 🪄 **AI Content Generation**: Magic-themed button for AI-powered content creation
- / **Slash Commands**: Type '/' to access block commands
- 📝 **Rich Text Editing**: Full formatting support with bubble menu
- 🎨 **Polaris Compliant**: Built with Shopify Polaris components
- 📱 **Responsive Design**: Works on all screen sizes
- 🌗 **Dark Mode Support**: Automatic dark mode adaptation

## Installation

The required Tiptap dependencies are already installed in the project. No additional packages needed.

## Basic Usage

```jsx
import NotionTiptapEditor from '../components/NotionTiptapEditor';

function MyComponent() {
  const [content, setContent] = useState('');

  return (
    <NotionTiptapEditor
      value={content}
      onChange={setContent}
      placeholder="Start typing or press '/' for commands..."
    />
  );
}
```

## Replacing Existing Editors

To replace the existing `AdvancedRTE` with the new Notion editor:

```jsx
// Before
import AdvancedRTE from '../components/AdvancedRTE';
<AdvancedRTE value={content} onChange={setContent} />

// After
import NotionTiptapEditor from '../components/NotionTiptapEditor';
<NotionTiptapEditor value={content} onChange={setContent} />
```

## Features Guide

### 1. AI Content Generation
- Click the **"Ask AI"** button in the toolbar (with magic gradient)
- Or type `/` and select "Ask AI to write"
- Enter your prompt and AI will generate content

### 2. Slash Commands
- Type `/` anywhere to see available commands
- Filter commands by typing after the slash
- Available blocks:
  - Headings (H1, H2, H3)
  - Text paragraph
  - Bullet/Numbered/Task lists
  - Quote blocks
  - Code blocks
  - Tables
  - Images/Videos
  - Dividers

### 3. Inline Formatting
- Select text to see the bubble menu
- Available formats: Bold, Italic, Underline, Strike, Code, Link

### 4. Toolbar Features
- Text formatting buttons
- Heading selector
- List options
- Text alignment
- More options dropdown
- AI Magic button

## API Endpoint for AI

To enable AI content generation, implement this endpoint:

```javascript
// app/routes/api.ai-generate.jsx
import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";

export async function action({ request }) {
  const { session } = await shopify.authenticate.admin(request);
  const { prompt } = await request.json();
  
  // Implement your AI service here (OpenAI, etc.)
  // Example response:
  return json({
    content: `<p>Generated content based on: ${prompt}</p>`
  });
}
```

## Styling Customization

The editor uses CSS modules for styling. To customize:

1. Edit `/app/components/NotionTiptapEditor.css`
2. Key classes:
   - `.notion-editor`: Main editor content
   - `.notion-toolbar`: Toolbar styling
   - `.notion-slash-menu`: Slash command menu
   - `.notion-bubble-menu`: Text selection menu

## Polaris Magic Theme

The AI button uses Polaris's magic theme:
- Gradient background (purple to pink)
- Special hover states
- Magic icon from Polaris icons
- Accessible contrast ratios

## Keyboard Shortcuts

- **Bold**: Cmd/Ctrl + B
- **Italic**: Cmd/Ctrl + I
- **Underline**: Cmd/Ctrl + U
- **Slash Commands**: /
- **Escape**: Close menus

## Content Storage

The editor outputs clean HTML that can be stored directly in your database:

```javascript
// Save content
const htmlContent = content; // from onChange
await saveToDatabase(htmlContent);

// Display content
<div dangerouslySetInnerHTML={{ __html: savedContent }} />
```

## Demo Route

Access the demo at: `/app/notion-editor-demo`

This shows:
- Live editor example
- HTML output preview
- Feature documentation
- Integration code examples

## Migration Tips

1. The new editor is drop-in compatible with existing HTML content
2. Import and export work the same as the previous editor
3. All Tiptap extensions are already configured
4. Styling is isolated to prevent conflicts

## Support

For issues or feature requests, please refer to:
- Tiptap documentation: https://tiptap.dev
- Polaris documentation: https://polaris.shopify.com
- This integration guide