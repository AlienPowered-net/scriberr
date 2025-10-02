import { Card, Page, Text, BlockStack, Banner, Button, InlineStack, Badge } from "@shopify/polaris";
import { useState, useEffect } from "react";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export async function loader() {
  return json({});
}

export default function DebugMentions() {
  const [debugData, setDebugData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customMentions, setCustomMentions] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);

  useEffect(() => {
    fetchDebugData();
  }, []);

  const fetchDebugData = async () => {
    setLoading(true);
    try {
      // Fetch debug info
      const debugResponse = await fetch('/api/test-mentions');
      const debugData = await debugResponse.json();
      setDebugData(debugData);

      // Fetch custom mentions
      const customResponse = await fetch('/api/custom-mentions');
      const customData = await customResponse.json();
      if (customData.success) {
        setCustomMentions(customData.mentions);
      }

      // Fetch staff members
      const staffResponse = await fetch('/api/get-staff');
      const staffData = await staffResponse.json();
      if (staffData.success) {
        setStaffMembers(staffData.staffMembers);
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
            {/* Current Scopes */}
            <Card>
              <div style={{ padding: '16px' }}>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Current API Scopes</Text>
                  {debugData?.debugInfo?.scope ? (
                    <>
                      <Text variant="bodyMd">
                        <strong>Granted Scopes:</strong> {debugData.debugInfo.scope}
                      </Text>
                      {debugData.debugInfo.scope.includes('read_users') ? (
                        <Badge tone="success">✓ read_users scope is active</Badge>
                      ) : (
                        <Banner tone="warning">
                          <p>
                            <strong>Missing read_users scope!</strong> The app needs to be reinstalled or reauthorized to access staff members.
                          </p>
                          <p style={{ marginTop: '8px' }}>
                            To trigger scope update: Uninstall and reinstall the app, or update the app configuration in Shopify Partners.
                          </p>
                        </Banner>
                      )}
                    </>
                  ) : (
                    <Text tone="subdued">No scope information available</Text>
                  )}
                </BlockStack>
              </div>
            </Card>

            {/* GraphQL Response */}
            <Card>
              <div style={{ padding: '16px' }}>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Shopify GraphQL Response</Text>
                  
                  {debugData?.hasErrors ? (
                    <Banner tone="critical">
                      <p><strong>GraphQL Errors:</strong></p>
                      <pre style={{ 
                        marginTop: '8px', 
                        padding: '12px', 
                        background: '#f9f9f9', 
                        borderRadius: '4px',
                        fontSize: '12px',
                        overflow: 'auto'
                      }}>
                        {JSON.stringify(debugData.graphqlResponse.errors, null, 2)}
                      </pre>
                    </Banner>
                  ) : (
                    <>
                      <InlineStack gap="200">
                        <Badge tone="success">✓ No GraphQL errors</Badge>
                        <Badge>{debugData?.staffCount || 0} staff members found</Badge>
                      </InlineStack>
                      
                      {debugData?.graphqlResponse?.data && (
                        <details style={{ marginTop: '12px' }}>
                          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                            View Raw GraphQL Response
                          </summary>
                          <pre style={{ 
                            marginTop: '8px', 
                            padding: '12px', 
                            background: '#f9f9f9', 
                            borderRadius: '4px',
                            fontSize: '11px',
                            overflow: 'auto',
                            maxHeight: '300px'
                          }}>
                            {JSON.stringify(debugData.graphqlResponse, null, 2)}
                          </pre>
                        </details>
                      )}
                    </>
                  )}
                </BlockStack>
              </div>
            </Card>

            {/* Shopify Staff Members */}
            <Card>
              <div style={{ padding: '16px' }}>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Shopify Staff Members ({staffMembers.length})
                  </Text>
                  
                  {staffMembers.length > 0 ? (
                    <div style={{ 
                      border: '1px solid #e1e3e5', 
                      borderRadius: '8px', 
                      overflow: 'hidden'
                    }}>
                      {staffMembers.map((member, index) => (
                        <div 
                          key={member.id}
                          style={{
                            padding: '12px 16px',
                            borderBottom: index < staffMembers.length - 1 ? '1px solid #e1e3e5' : 'none',
                            backgroundColor: 'white'
                          }}
                        >
                          <InlineStack gap="200" align="space-between">
                            <div>
                              <Text variant="bodyMd" fontWeight="semibold">
                                {member.label}
                              </Text>
                              <Text variant="bodySm" tone="subdued">
                                {member.email}
                              </Text>
                            </div>
                            {member.isOwner && <Badge tone="info">Owner</Badge>}
                          </InlineStack>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Banner tone="warning">
                      <p>No Shopify staff members found. This could mean:</p>
                      <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
                        <li>The read_users scope hasn't been approved yet</li>
                        <li>You're the only user on the store</li>
                        <li>Staff members need to be added in Shopify Admin → Settings → Users and permissions</li>
                      </ul>
                    </Banner>
                  )}
                </BlockStack>
              </div>
            </Card>

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

            {/* Current User Info */}
            <Card>
              <div style={{ padding: '16px' }}>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Current User (You)</Text>
                  
                  {debugData?.debugInfo?.currentUser ? (
                    <div style={{ 
                      padding: '12px', 
                      background: '#f8f9fa', 
                      borderRadius: '6px' 
                    }}>
                      <Text variant="bodyMd">
                        <strong>Name:</strong> {debugData.debugInfo.currentUser.first_name} {debugData.debugInfo.currentUser.last_name}
                      </Text>
                      <Text variant="bodyMd">
                        <strong>Email:</strong> {debugData.debugInfo.currentUser.email}
                      </Text>
                      <Text variant="bodyMd">
                        <strong>ID:</strong> {debugData.debugInfo.currentUser.id}
                      </Text>
                    </div>
                  ) : (
                    <Text tone="subdued">No current user information available</Text>
                  )}
                </BlockStack>
              </div>
            </Card>

            {/* How to Add Test Staff */}
            <Card>
              <div style={{ padding: '16px' }}>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">How to Test with Multiple Staff Members</Text>
                  
                  <Banner tone="info">
                    <BlockStack gap="200">
                      <Text variant="bodyMd" fontWeight="semibold">Option 1: Add Staff in Shopify Admin</Text>
                      <ol style={{ marginLeft: '20px' }}>
                        <li>Go to Shopify Admin → Settings → Users and permissions</li>
                        <li>Click "Add staff"</li>
                        <li>Enter name and email for the new staff member</li>
                        <li>Set permissions (any permission level works)</li>
                        <li>Save and send invite</li>
                        <li>Come back to this page and click "Refresh Data" below</li>
                      </ol>
                    </BlockStack>
                  </Banner>

                  <Banner>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" fontWeight="semibold">Option 2: Use Custom Mentions (No Shopify Staff Needed)</Text>
                      <ol style={{ marginLeft: '20px' }}>
                        <li>Go to Settings → Custom Mentions</li>
                        <li>Click "Add Person"</li>
                        <li>Add any name and email you want</li>
                        <li>These will appear in @ mentions immediately</li>
                        <li>Great for mentioning clients, team members, or anyone!</li>
                      </ol>
                    </BlockStack>
                  </Banner>

                  <div style={{ marginTop: '16px' }}>
                    <Button onClick={fetchDebugData}>Refresh Data</Button>
                  </div>
                </BlockStack>
              </div>
            </Card>

            {/* Force Scope Update Instructions */}
            <Card>
              <div style={{ padding: '16px' }}>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Force Scope Update</Text>
                  
                  <Banner tone="warning">
                    <BlockStack gap="300">
                      <Text variant="bodyMd">
                        If the app isn't requesting the new read_users scope, try these steps:
                      </Text>
                      
                      <div>
                        <Text variant="bodyMd" fontWeight="semibold">Method 1: Reinstall the App</Text>
                        <ol style={{ marginLeft: '20px', marginTop: '8px' }}>
                          <li>Go to Shopify Admin → Apps</li>
                          <li>Find "Scriberr" and click the three dots</li>
                          <li>Click "Uninstall"</li>
                          <li>Reinstall the app from the link/partner dashboard</li>
                          <li>The new scope will be requested during installation</li>
                        </ol>
                      </div>

                      <div>
                        <Text variant="bodyMd" fontWeight="semibold">Method 2: Update in Partner Dashboard</Text>
                        <ol style={{ marginLeft: '20px', marginTop: '8px' }}>
                          <li>Go to Shopify Partners → Apps → Scriberr</li>
                          <li>Click "App setup"</li>
                          <li>Under "Admin API access scopes", verify read_users is selected</li>
                          <li>Save changes</li>
                          <li>Reinstall on your test store</li>
                        </ol>
                      </div>

                      <div>
                        <Text variant="bodyMd" fontWeight="semibold">Method 3: Dev Environment</Text>
                        <ol style={{ marginLeft: '20px', marginTop: '8px' }}>
                          <li>Run: <code>npm run dev</code></li>
                          <li>The app will automatically request updated scopes</li>
                          <li>Approve the new permissions when prompted</li>
                        </ol>
                      </div>
                    </BlockStack>
                  </Banner>
                </BlockStack>
              </div>
            </Card>
          </>
        )}
      </BlockStack>
    </Page>
  );
}
