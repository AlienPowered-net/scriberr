import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { shopify } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  // Get shop parameter if provided
  const shop = url.searchParams.get("shop") || "dev-alienpowered.myshopify.com";
  
  try {
    // Create a proper Shopify auth URL
    const authUrl = await shopify.auth.begin({
      shop,
      callbackPath: "/auth/callback",
      isOnline: false,
      rawRequest: request,
    });
    
    return {
      status: "auth_url_created",
      message: "Authentication URL created successfully",
      authUrl: authUrl,
      shop: shop,
      config: {
        apiKey: process.env.SHOPIFY_API_KEY?.substring(0, 10) + "...",
        appUrl: process.env.SHOPIFY_APP_URL,
        scopes: process.env.SCOPES,
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: "error",
      message: error.message,
      errorType: error.constructor.name,
      shop: shop,
      timestamp: new Date().toISOString()
    };
  }
};

export default function AuthFix() {
  const data = useLoaderData<typeof loader>();
  
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Authentication Fix & Test</h1>
      
      <div style={{ 
        background: data.status === "auth_url_created" ? "#d4edda" : "#f8d7da",
        padding: "15px", 
        border: `1px solid ${data.status === "auth_url_created" ? "#c3e6cb" : "#f5c6cb"}`,
        borderRadius: "5px",
        marginBottom: "20px"
      }}>
        <h2>Status: {data.status.toUpperCase()}</h2>
        <p><strong>Message:</strong> {data.message}</p>
        <p><strong>Shop:</strong> {data.shop}</p>
      </div>
      
      {data.authUrl && (
        <div style={{ marginBottom: "20px", padding: "15px", background: "#d1ecf1", border: "1px solid #bee5eb", borderRadius: "5px" }}>
          <h3>🔗 Authentication URL</h3>
          <p>Click this link to authenticate:</p>
          <a href={data.authUrl} style={{ color: "#0066cc", textDecoration: "underline" }}>
            {data.authUrl}
          </a>
        </div>
      )}
      
      {data.config && (
        <div style={{ marginBottom: "20px" }}>
          <h3>⚙️ Configuration</h3>
          <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "5px" }}>
            <p><strong>API Key:</strong> {data.config.apiKey}</p>
            <p><strong>App URL:</strong> {data.config.appUrl}</p>
            <p><strong>Scopes:</strong> {data.config.scopes}</p>
          </div>
        </div>
      )}
      
      <details>
        <summary>Full Debug Data</summary>
        <pre style={{ background: "#f5f5f5", padding: "10px", overflow: "auto" }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
      
      <div style={{ marginTop: "20px", padding: "15px", background: "#fff3cd", border: "1px solid #ffeaa7", borderRadius: "5px" }}>
        <h3>🔧 Testing Instructions</h3>
        <ol>
          <li>If auth URL is shown above, click it to complete authentication</li>
          <li>After authentication, try accessing the app in Shopify admin</li>
          <li>The app should now work without "Something went wrong" error</li>
        </ol>
      </div>
    </div>
  );
}