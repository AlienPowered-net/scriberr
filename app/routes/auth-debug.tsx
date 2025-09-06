import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  // Extract all query parameters and headers
  const queryParams = Object.fromEntries(url.searchParams);
  const headers = Object.fromEntries(request.headers);
  
  // Check for Shopify-specific parameters
  const shopifyParams = {
    shop: queryParams.shop,
    host: queryParams.host,
    embedded: queryParams.embedded,
    session: queryParams.session,
    timestamp: queryParams.timestamp,
    signature: queryParams.signature ? "present" : "missing",
    hmac: queryParams.hmac ? "present" : "missing",
  };
  
  return {
    url: url.toString(),
    queryParams,
    shopifyParams,
    headers: {
      'user-agent': headers['user-agent'],
      'referer': headers['referer'],
      'x-forwarded-for': headers['x-forwarded-for'],
      'x-shopify-shop-domain': headers['x-shopify-shop-domain'],
      'x-shopify-api-request-failure-reauthorize': headers['x-shopify-api-request-failure-reauthorize'],
    },
    env: {
      SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY?.substring(0, 10) + "...",
      SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
      APP_URL: process.env.APP_URL,
    },
    timestamp: new Date().toISOString()
  };
};

export default function AuthDebug() {
  const data = useLoaderData<typeof loader>();
  
  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h1>Shopify Authentication Debug</h1>
      
      <div style={{ marginBottom: "20px" }}>
        <h2>🔍 Request Analysis</h2>
        <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "5px" }}>
          <p><strong>URL:</strong> {data.url}</p>
          <p><strong>Has Shopify Shop Param:</strong> {data.shopifyParams.shop ? "✅ Yes" : "❌ No"}</p>
          <p><strong>Has HMAC:</strong> {data.shopifyParams.hmac === "present" ? "✅ Yes" : "❌ No"}</p>
          <p><strong>Embedded Mode:</strong> {data.shopifyParams.embedded || "Not specified"}</p>
        </div>
      </div>
      
      <details style={{ marginBottom: "20px" }}>
        <summary><strong>Shopify Parameters</strong></summary>
        <pre style={{ background: "#f5f5f5", padding: "10px", overflow: "auto" }}>
          {JSON.stringify(data.shopifyParams, null, 2)}
        </pre>
      </details>
      
      <details style={{ marginBottom: "20px" }}>
        <summary><strong>All Query Parameters</strong></summary>
        <pre style={{ background: "#f5f5f5", padding: "10px", overflow: "auto" }}>
          {JSON.stringify(data.queryParams, null, 2)}
        </pre>
      </details>
      
      <details style={{ marginBottom: "20px" }}>
        <summary><strong>Headers</strong></summary>
        <pre style={{ background: "#f5f5f5", padding: "10px", overflow: "auto" }}>
          {JSON.stringify(data.headers, null, 2)}
        </pre>
      </details>
      
      <details>
        <summary><strong>Environment</strong></summary>
        <pre style={{ background: "#f5f5f5", padding: "10px", overflow: "auto" }}>
          {JSON.stringify(data.env, null, 2)}
        </pre>
      </details>
    </div>
  );
}