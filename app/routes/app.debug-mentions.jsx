import { Card, Page, Text, BlockStack, Banner, Button, InlineStack, Badge } from "@shopify/polaris";
import { useState, useEffect } from "react";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export async function loader() {
  return json({});
}

export default function DebugMentions() {
  const [loading, setLoading] = useState(true);
  const [customMentions, setCustomMentions] = useState([]);

  useEffect(() => {
    fetchDebugData();
  }, []);

  const fetchDebugData = async () => {
    setLoading(true);
    try {
      // Fetch custom mentions
      const customResponse = await fetch('/api/custom-mentions');
      const customData = await customResponse.json();
      if (customData.success) {
        setCustomMentions(customData.mentions);
      }
    } catch (error) {
      console.error('Error fetching debug data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page 
      title="Mentions Debug Information"
      backAction={{ content: 'Settings', url: '/app/settings' }}
    >
      <BlockStack gap="500">
        <Banner tone="info">
          <p>This page helps you debug the mentions system and see what data is available.</p>
        </Banner>

        {loading ? (
          <Card>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <Text variant="bodyMd">Loading debug information...</Text>
            </div>
          </Card>
        ) : (
          <>
            <Banner tone="success">
              <p><strong>Custom Mentions System Active</strong></p>
              <p>This app uses custom mentions only - no Shopify API scopes required!</p>
            </Banner>

            {/* Custom Mentions */}
            <Card>
              <div style={{ padding: '16px' }}>
                <BlockStack gap="400">
                  <InlineStack gap="200" align="space-between">
                    <Text as="h2" variant="headingMd">
                      Custom Mentions ({customMentions.length})
                    </Text>
                    <Button url="/app/settings">Go to Settings</Button>
                  </InlineStack>
                  
                  {customMentions.length > 0 ? (
                    <div style={{ 
                      border: '1px solid #e1e3e5', 
                      borderRadius: '8px', 
                      overflow: 'hidden'
                    }}>
                      {customMentions.map((mention, index) => (
                        <div 
                          key={mention.id}
                          style={{
                            padding: '12px 16px',
                            borderBottom: index < customMentions.length - 1 ? '1px solid #e1e3e5' : 'none'
                          }}
                        >
                          <Text variant="bodyMd" fontWeight="semibold">
                            {mention.name}
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                            {mention.email}
                          </Text>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Banner tone="info">
                      <p>No custom mentions added yet. Add people in Settings → Custom Mentions.</p>
                    </Banner>
                  )}
                </BlockStack>
              </div>
            </Card>

            {/* How to Use Custom Mentions */}
            <Card>
              <div style={{ padding: '16px' }}>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">How to Use Custom Mentions</Text>
                  
                  <Banner tone="info">
                    <BlockStack gap="200">
                      <Text variant="bodyMd" fontWeight="semibold">Adding People to Mention:</Text>
                      <ol style={{ marginLeft: '20px' }}>
                        <li>Go to Settings → Custom Mentions</li>
                        <li>Click "Add Person"</li>
                        <li>Enter their name and email</li>
                        <li>Click "Add"</li>
                        <li>They'll appear in @ mentions immediately!</li>
                      </ol>
                    </BlockStack>
                  </Banner>

                  <Banner>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" fontWeight="semibold">Using Mentions in Notes:</Text>
                      <ol style={{ marginLeft: '20px' }}>
                        <li>Open any note in the Dashboard</li>
                        <li>Type @ (at symbol) in the editor</li>
                        <li>A list of all your custom mentions will appear</li>
                        <li>Start typing to filter by name or email</li>
                        <li>Click or press Enter to insert the mention</li>
                      </ol>
                    </BlockStack>
                  </Banner>

                  <div style={{ marginTop: '16px' }}>
                    <Button onClick={fetchDebugData}>Refresh Data</Button>
                  </div>
                </BlockStack>
              </div>
            </Card>
          </>
        )}
      </BlockStack>
    </Page>
  );
}
