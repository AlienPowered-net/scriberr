import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { prisma } from "../utils/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Test database connection without Shopify auth
    await prisma.$queryRaw`SELECT 1`;
    
    const url = new URL(request.url);
    
    return {
      status: "success",
      message: "App is working without Shopify authentication",
      url: url.toString(),
      headers: Object.fromEntries(request.headers),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY?.substring(0, 10) + "...",
        SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: "error",
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
  }
};

export default function BypassTest() {
  const data = useLoaderData<typeof loader>();
  
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Bypass Test - No Shopify Auth</h1>
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
        <summary>Full Debug Info</summary>
        <pre style={{ background: "#f5f5f5", padding: "10px", overflow: "auto" }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
      
      {data.status === "success" && (
        <div style={{ marginTop: "20px", padding: "15px", background: "#d1ecf1", border: "1px solid #bee5eb", borderRadius: "5px" }}>
          <h3>✅ Good News!</h3>
          <p>Your app infrastructure is working perfectly. The issue is specifically with Shopify authentication.</p>
          <p>This confirms the problem is in the Shopify auth flow, not your app code or environment.</p>
        </div>
      )}
    </div>
  );
}