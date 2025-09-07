import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, Text, BlockStack } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  console.log("🔍 App with context - URL:", url.toString());
  console.log("🔍 Search params:", Object.fromEntries(url.searchParams));
  console.log("🔍 Headers:", Object.fromEntries(request.headers));
  
  // Check if we have shop context
  const shopParam = url.searchParams.get("shop");
  const hostParam = url.searchParams.get("host");
  const embeddedParam = url.searchParams.get("embedded");
  
  console.log("🔍 Shopify params - shop:", shopParam, "host:", hostParam, "embedded:", embeddedParam);
  
  // If no shop parameter and we're not in an embedded context, redirect to add it
  if (!shopParam && !hostParam) {
    console.log("⚠️ No shop context, redirecting to add shop parameter");
    const newUrl = new URL(request.url);
    newUrl.searchParams.set("shop", "dev-alienpowered.myshopify.com");
    newUrl.searchParams.set("embedded", "1");
    return redirect(newUrl.toString());
  }
  
  try {
    console.log("🔍 Attempting authentication with shop context...");
    const { session } = await authenticate.admin(request);
    console.log("✅ Authentication successful!");
    
    return {
      success: true,
      shop: session.shop,
      accessToken: !!session.accessToken,
      scope: session.scope,
      isOnline: session.isOnline,
      shopParam,
      hostParam,
      embeddedParam,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error("❌ Authentication failed:", error);
    
    if (error instanceof Response) {
      console.log("🔀 Redirect response:", error.status, error.headers.get("Location"));
      throw error; // Let the redirect happen
    }
    
    throw error;
  }
};

export default function AppWithContext() {
  const data = useLoaderData<typeof loader>();
  
  return (
    <Page title="ScriberrDEV - Context Test">
      <Card>
        <BlockStack gap="400">
          <Text variant="headingLg" as="h1">🎉 App Working with Shopify Context!</Text>
          
          <div style={{ background: "#d4edda", padding: "15px", borderRadius: "5px" }}>
            <Text variant="headingMd" as="h2">✅ Authentication Successful</Text>
            <Text>Shop: {data.shop}</Text>
            <Text>Access Token: {data.accessToken ? "Present" : "Missing"}</Text>
            <Text>Scope: {data.scope}</Text>
            <Text>Online Session: {data.isOnline ? "Yes" : "No"}</Text>
          </div>
          
          <div style={{ background: "#e7f3ff", padding: "15px", borderRadius: "5px" }}>
            <Text variant="headingMd" as="h2">📋 Context Parameters</Text>
            <Text>Shop Parameter: {data.shopParam || "Not provided"}</Text>
            <Text>Host Parameter: {data.hostParam || "Not provided"}</Text>
            <Text>Embedded Parameter: {data.embeddedParam || "Not provided"}</Text>
          </div>
          
          <Text>Timestamp: {data.timestamp}</Text>
          
          <div style={{ background: "#fff3cd", padding: "15px", borderRadius: "5px" }}>
            <Text variant="headingMd" as="h2">🔧 Next Steps</Text>
            <Text>If you see this page, the app infrastructure is working correctly!</Text>
            <Text>The main app route may have specific issues that need to be addressed.</Text>
          </div>
        </BlockStack>
      </Card>
    </Page>
  );
}