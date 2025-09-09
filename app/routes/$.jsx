import { Link } from "@remix-run/react";
import { Page, Layout, Card, Text, Button, BlockStack } from "@shopify/polaris";

export default function CatchAll() {
  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h1" variant="headingLg">
                Page Not Found
              </Text>
              <Text as="p" variant="bodyMd">
                The page you're looking for doesn't exist or you may not have permission to access it.
              </Text>
              <Text as="p" variant="bodyMd">
                This is a Shopify app that requires proper authentication. Please make sure you're accessing it through the Shopify admin panel.
              </Text>
              <div>
                <Button url="/app" variant="primary">
                  Go to App
                </Button>
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}