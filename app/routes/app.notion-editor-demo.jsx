import { json } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { shopify } from "../shopify.server";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Banner,
  Link,
  Box,
  Divider
} from "@shopify/polaris";
import { useState } from "react";
import NotionTiptapEditor from "../components/NotionTiptapEditor";

export async function loader({ request }) {
  const { session } = await shopify.authenticate.admin(request);
  return json({ shop: session.shop });
}

export default function NotionEditorDemo() {
  const { shop } = useLoaderData();
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');

  const handleSave = () => {
    setSavedContent(content);
  };

  return (
    <Page 
      title="Notion-like Editor Demo"
      subtitle="Experience the new Notion-style text editor with AI capabilities"
      backAction={{ content: 'Products', url: '/app' }}
    >
      <Layout>
        <Layout.Section>
          <Banner
            title="New Notion-like Editor"
            tone="info"
            action={{ content: 'Learn more', url: '#' }}
          >
            <p>
              This editor provides a clean, Notion-inspired interface with powerful features including:
            </p>
            <ul>
              <li>Slash commands (type '/' to see options)</li>
              <li>AI content generation with the magic button</li>
              <li>Rich text formatting with bubble menu</li>
              <li>Block-based content structure</li>
              <li>Polaris-compliant design</li>
            </ul>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Card.Section>
              <BlockStack gap="4">
                <Text variant="headingMd" as="h2">
                  Try the Editor
                </Text>
                <Text variant="bodyMd" color="subdued">
                  Start typing or press '/' to see available commands. Select text to see formatting options.
                </Text>
              </BlockStack>
            </Card.Section>
            
            <Divider />
            
            <Card.Section>
              <NotionTiptapEditor
                value={content}
                onChange={setContent}
                placeholder="Start typing or press '/' for commands..."
              />
            </Card.Section>
            
            <Card.Section>
              <InlineStack align="end">
                <Button onClick={handleSave} variant="primary">
                  Save Content
                </Button>
              </InlineStack>
            </Card.Section>
          </Card>
        </Layout.Section>

        {savedContent && (
          <Layout.Section>
            <Card>
              <Card.Section>
                <BlockStack gap="4">
                  <Text variant="headingMd" as="h2">
                    Saved Content (HTML)
                  </Text>
                  <Box padding="4" background="bg-surface-secondary" borderRadius="100">
                    <pre style={{ 
                      overflow: 'auto', 
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      margin: 0 
                    }}>
                      {savedContent}
                    </pre>
                  </Box>
                </BlockStack>
              </Card.Section>
              
              <Divider />
              
              <Card.Section>
                <BlockStack gap="4">
                  <Text variant="headingMd" as="h2">
                    Preview
                  </Text>
                  <div 
                    dangerouslySetInnerHTML={{ __html: savedContent }}
                    style={{ 
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      lineHeight: '1.6'
                    }}
                  />
                </BlockStack>
              </Card.Section>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <Card.Section>
              <BlockStack gap="4">
                <Text variant="headingMd" as="h2">
                  Features Guide
                </Text>
                
                <BlockStack gap="3">
                  <div>
                    <Text variant="headingSm" as="h3">
                      🪄 AI Content Generation
                    </Text>
                    <Text variant="bodyMd" color="subdued">
                      Click the "Ask AI" button (with magic theme) in the toolbar or use the slash command to generate content with AI.
                    </Text>
                  </div>
                  
                  <div>
                    <Text variant="headingSm" as="h3">
                      / Slash Commands
                    </Text>
                    <Text variant="bodyMd" color="subdued">
                      Type '/' anywhere in the editor to see available block types and actions. You can filter by typing after the slash.
                    </Text>
                  </div>
                  
                  <div>
                    <Text variant="headingSm" as="h3">
                      ✏️ Inline Formatting
                    </Text>
                    <Text variant="bodyMd" color="subdued">
                      Select any text to see the bubble menu with formatting options like bold, italic, links, and more.
                    </Text>
                  </div>
                  
                  <div>
                    <Text variant="headingSm" as="h3">
                      ➕ Block Menu
                    </Text>
                    <Text variant="bodyMd" color="subdued">
                      Hover over the left side of any block to see the + button for adding new blocks.
                    </Text>
                  </div>
                  
                  <div>
                    <Text variant="headingSm" as="h3">
                      📋 Rich Content Support
                    </Text>
                    <Text variant="bodyMd" color="subdued">
                      Supports headings, lists, task lists, quotes, code blocks, tables, images, videos, and more.
                    </Text>
                  </div>
                </BlockStack>
              </BlockStack>
            </Card.Section>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Card.Section>
              <BlockStack gap="4">
                <Text variant="headingMd" as="h2">
                  Integration Example
                </Text>
                <Box padding="4" background="bg-surface-secondary" borderRadius="100">
                  <pre style={{ 
                    overflow: 'auto', 
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    margin: 0 
                  }}>
{`import NotionTiptapEditor from '../components/NotionTiptapEditor';

// In your component:
const [content, setContent] = useState('');

<NotionTiptapEditor
  value={content}
  onChange={setContent}
  placeholder="Start typing or press '/' for commands..."
/>`}
                  </pre>
                </Box>
              </BlockStack>
            </Card.Section>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}