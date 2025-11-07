import { json } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import { Page, Layout, Card, BlockStack, Text, Button } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    await authenticate.admin(request);
    return json({});
  } catch (error) {
    console.error("Failed to authenticate billing success route", error);
    throw error;
  }
};

export default function BillingSuccess() {
  const navigate = useNavigate();

  return (
    <Page
      title="You're on Scriberr Pro!"
      subtitle="Subscription confirmed successfully."
      backAction={{
        content: "Back to settings",
        onAction: () => navigate("/app/settings"),
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="bodyMd" as="p">
                Thanks for upgrading to Scriberr Pro. You now have access to
                unlimited notes, folders, contacts, tags, and full version
                history.
              </Text>
              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">
                  Next steps
                </Text>
                <Text as="p" variant="bodySm">
                  Explore the Contacts workspace, organize with tags, and enjoy
                  unlimited access to Scriberr features.
                </Text>
              </BlockStack>
              <Button onClick={() => navigate("/app/dashboard")} variant="primary">
                Go to dashboard
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

