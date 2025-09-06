import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  // Log all the request details for debugging
  const debugInfo = {
    url: url.toString(),
    method: request.method,
    headers: Object.fromEntries(request.headers),
    searchParams: Object.fromEntries(url.searchParams),
    timestamp: new Date().toISOString(),
  };
  
  try {
    console.log("🔍 Attempting Shopify authentication with:", debugInfo);
    
    // Try to authenticate with Shopify
    const { session, admin } = await authenticate.admin(request);
    
    console.log("✅ Authentication successful:", {
      shop: session.shop,
      isOnline: session.isOnline,
      scope: session.scope,
    });
    
    return {
      status: "success",
      message: "Shopify authentication successful!",
      session: {
        shop: session.shop,
        isOnline: session.isOnline,
        scope: session.scope,
        accessToken: session.accessToken ? "SET" : "NOT SET",
      },
      debugInfo,
    };
  } catch (error) {
    console.error("❌ Authentication failed:", error);
    
    // Check if this is a redirect response
    if (error instanceof Response) {
      const location = error.headers.get("Location");
      console.log("🔀 Authentication redirect to:", location);
      
      return {
        status: "redirect",
        message: "Shopify is redirecting for authentication",
        redirectUrl: location,
        statusCode: error.status,
        debugInfo,
      };
    }
    
    return {
      status: "error",
      message: error.message,
      errorType: error.constructor.name,
      stack: error.stack,
      debugInfo,
    };
  }
};

export default function ShopifyAuthTest() {
  const data = useLoaderData<typeof loader>();
  
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Shopify Authentication Test</h1>
      
      <div style={{ 
        background: data.status === "success" ? "#d4edda" : 
                   data.status === "redirect" ? "#fff3cd" : "#f8d7da",
        padding: "15px", 
        border: `1px solid ${data.status === "success" ? "#c3e6cb" : 
                              data.status === "redirect" ? "#ffeaa7" : "#f5c6cb"}`,
        borderRadius: "5px",
        marginBottom: "20px"
      }}>
        <h2>Status: {data.status.toUpperCase()}</h2>
        <p><strong>Message:</strong> {data.message}</p>
        
        {data.status === "redirect" && (
          <div style={{ marginTop: "10px" }}>
            <p><strong>Redirect URL:</strong> {data.redirectUrl}</p>
            <p><strong>Status Code:</strong> {data.statusCode}</p>
          </div>
        )}
        
        {data.session && (
          <div style={{ marginTop: "10px" }}>
            <h3>Session Info:</h3>
            <p><strong>Shop:</strong> {data.session.shop}</p>
            <p><strong>Online:</strong> {data.session.isOnline ? "Yes" : "No"}</p>
            <p><strong>Scope:</strong> {data.session.scope}</p>
            <p><strong>Access Token:</strong> {data.session.accessToken}</p>
          </div>
        )}
      </div>
      
      <details>
        <summary><strong>Debug Information</strong></summary>
        <pre style={{ background: "#f5f5f5", padding: "10px", overflow: "auto" }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
      
      {data.status === "redirect" && (
        <div style={{ marginTop: "20px", padding: "15px", background: "#d1ecf1", border: "1px solid #bee5eb", borderRadius: "5px" }}>
          <h3>🔀 Redirect Detected</h3>
          <p>Shopify is trying to redirect for authentication. This suggests:</p>
          <ul>
            <li>The app needs to be installed or re-authorized</li>
            <li>There might be a scope mismatch</li>
            <li>The authentication flow is not completing properly</li>
          </ul>
        </div>
      )}
      
      {data.status === "error" && (
        <div style={{ marginTop: "20px", padding: "15px", background: "#f8d7da", border: "1px solid #f5c6cb", borderRadius: "5px" }}>
          <h3>❌ Authentication Error</h3>
          <p>Error Type: <strong>{data.errorType}</strong></p>
          <p>This indicates a problem with the Shopify authentication configuration.</p>
        </div>
      )}
    </div>
  );
}