import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Try to authenticate
    const { session } = await authenticate.admin(request);
    
    return {
      status: "success",
      message: "Authentication successful",
      shop: session.shop,
      accessToken: session.accessToken ? "SET" : "NOT SET",
      scope: session.scope,
      isOnline: session.isOnline,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: "error",
      message: error.message,
      errorType: error.constructor.name,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
  }
};

export default function TestAuth() {
  const data = useLoaderData<typeof loader>();
  
  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h1>Shopify Authentication Test</h1>
      <div style={{ 
        background: data.status === "success" ? "#d4edda" : "#f8d7da", 
        padding: "15px", 
        border: `1px solid ${data.status === "success" ? "#c3e6cb" : "#f5c6cb"}`,
        borderRadius: "5px",
        marginBottom: "20px"
      }}>
        <h2>Status: {data.status.toUpperCase()}</h2>
        <p><strong>Message:</strong> {data.message}</p>
      </div>
      
      <details>
        <summary>Full Details</summary>
        <pre style={{ background: "#f5f5f5", padding: "10px", overflow: "auto" }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
      
      {data.status === "error" && (
        <div style={{ marginTop: "20px", padding: "15px", background: "#fff3cd", border: "1px solid #ffeaa7", borderRadius: "5px" }}>
          <h3>🔧 Troubleshooting Steps:</h3>
          <ol>
            <li>Ensure ScriberrDEV app configuration is deployed via Shopify CLI</li>
            <li>Check that app URLs match in Shopify Partners dashboard</li>
            <li>Verify environment variables are correct</li>
            <li>Try reinstalling the app on your dev store</li>
          </ol>
        </div>
      )}
    </div>
  );
}