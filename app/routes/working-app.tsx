import { LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, Text, BlockStack } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../utils/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    console.log("🔍 Working app - attempting authentication...");
    const { session } = await authenticate.admin(request);
    console.log("✅ Authentication successful for shop:", session.shop);
    
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connection successful");
    
    // Get basic shop info
    const shopQuery = await prisma.shop.findFirst({
      where: { domain: session.shop }
    });
    
    return json({
      success: true,
      shop: session.shop,
      shopInDb: !!shopQuery,
      accessToken: !!session.accessToken,
      scope: session.scope,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Working app error:", error);
    
    if (error instanceof Response) {
      console.log("🔀 Authentication redirect:", error.status, error.headers.get("Location"));
      throw error; // Let the redirect happen
    }
    
    return json({
      success: false,
      error: error.message,
      errorType: error.constructor.name,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

export default function WorkingApp() {
  const data = useLoaderData<typeof loader>();
  
  if (!data.success) {
    return (
      <Page title="Error">
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">Something went wrong</Text>
            <Text>Error: {data.error}</Text>
            <Text>Type: {data.errorType}</Text>
            <Text>Time: {data.timestamp}</Text>
          </BlockStack>
        </Card>
      </Page>
    );
  }
  
  return (
    <Page title="ScriberrDEV - Working!">
      <Card>
        <BlockStack gap="400">
          <Text variant="headingLg" as="h1">🎉 Success! App is Working</Text>
          <Text>Shop: {data.shop}</Text>
          <Text>Shop in Database: {data.shopInDb ? "Yes" : "No"}</Text>
          <Text>Access Token: {data.accessToken ? "Present" : "Missing"}</Text>
          <Text>Scope: {data.scope}</Text>
          <Text>Time: {data.timestamp}</Text>
          
          <div style={{ padding: "15px", background: "#d4edda", borderRadius: "5px" }}>
            <Text variant="headingMd" as="h3">✅ All Systems Working</Text>
            <Text>• Authentication: Success</Text>
            <Text>• Database: Connected</Text>
            <Text>• Environment: Configured</Text>
            <Text>• Domain: scriberrdev.vercel.app</Text>
          </div>
        </BlockStack>
      </Card>
    </Page>
  );
}