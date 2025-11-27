/**
 * Debug Editor Route
 * 
 * Test route for the minimal mention debug editor.
 * Access at: /app/debug-editor
 * 
 * This helps isolate whether the "frozen input after mention" bug
 * is in Tiptap core or in our custom code.
 */

import { Page, Layout, Banner, Button, InlineStack } from "@shopify/polaris";
import { json } from "@remix-run/node";
import MinimalMentionDebugEditor from "../components/MinimalMentionDebugEditor";

export async function loader() {
  return json({});
}

export default function DebugEditorPage() {
  return (
    <Page 
      title="Debug Editor - Mention Testing"
      backAction={{ content: 'Dashboard', url: '/app/dashboard' }}
      secondaryActions={[
        { content: 'Debug Mentions Data', url: '/app/debug-mentions' },
        { content: 'Settings', url: '/app/settings' },
      ]}
    >
      <Layout>
        <Layout.Section>
          <Banner tone="warning">
            <p>
              <strong>Developer Tool:</strong> This page tests the Tiptap mention system in isolation 
              using ONLY the stock <code>@tiptap/extension-mention</code>.
            </p>
            <p style={{ marginTop: '8px' }}>
              If typing works here after inserting a mention, but not in the main note editor, 
              the bug is in our custom <code>EntityMention</code> extension or editor wrappers.
            </p>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <MinimalMentionDebugEditor />
        </Layout.Section>

        <Layout.Section>
          <InlineStack gap="300">
            <Button url="/app/dashboard">Back to Dashboard</Button>
            <Button url="/app/notion-editor-demo">Test NotionTiptapEditor</Button>
          </InlineStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

