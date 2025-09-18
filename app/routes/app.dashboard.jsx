import {
  Card,
  Page,
  Text,
  BlockStack,
} from "@shopify/polaris";

export default function Dashboard() {
  return (
    <Page title="Dashboard">
      <div style={{ display: "flex", gap: "16px" }}>
        <div style={{ flex: 1 }}>
          <Card>
            <div style={{ padding: "16px" }}>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Dashboard
                </Text>
                <Text as="p" variant="bodyMd">
                  Welcome to your Dashboard. This is a blank page where you can add your dashboard content.
                </Text>
              </BlockStack>
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}