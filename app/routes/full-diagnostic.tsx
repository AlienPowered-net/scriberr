import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { shopify, authenticate } from "../shopify.server";
import { prisma } from "../utils/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "dev-alienpowered.myshopify.com";
  
  // Comprehensive diagnostic
  const diagnostic = {
    timestamp: new Date().toISOString(),
    request: {
      url: url.toString(),
      method: request.method,
      headers: {
        'user-agent': request.headers.get('user-agent'),
        'host': request.headers.get('host'),
        'x-shopify-shop-domain': request.headers.get('x-shopify-shop-domain'),
        'x-shopify-api-request-failure-reauthorize': request.headers.get('x-shopify-api-request-failure-reauthorize'),
      },
      searchParams: Object.fromEntries(url.searchParams),
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY?.substring(0, 15) + "...",
      SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET ? "SET (length: " + process.env.SHOPIFY_API_SECRET.length + ")" : "NOT SET",
      SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
      APP_URL: process.env.APP_URL,
      SCOPES: process.env.SCOPES,
    },
    shopifyConfig: {
      apiKey: shopify.config.apiKey?.substring(0, 15) + "...",
      apiVersion: shopify.config.apiVersion,
      appUrl: shopify.config.appUrl,
      scopes: shopify.config.scopes,
      authPathPrefix: shopify.config.auth?.path,
    },
  };
  
  // Test database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    diagnostic.database = { status: "connected" };
  } catch (dbError) {
    diagnostic.database = { 
      status: "error", 
      error: dbError.message 
    };
  }
  
  // Test authentication
  try {
    const { session } = await authenticate.admin(request);
    diagnostic.authentication = {
      status: "success",
      shop: session.shop,
      accessToken: session.accessToken ? "SET" : "NOT SET",
      scope: session.scope,
      isOnline: session.isOnline,
    };
  } catch (authError) {
    if (authError instanceof Response) {
      const location = authError.headers.get("Location");
      diagnostic.authentication = {
        status: "redirect",
        redirectUrl: location,
        statusCode: authError.status,
        statusText: authError.statusText,
      };
    } else {
      diagnostic.authentication = {
        status: "error",
        message: authError.message,
        errorType: authError.constructor.name,
      };
    }
  }
  
  // Test session storage
  try {
    const sessionId = `offline_${shop}`;
    const testSession = await shopify.sessionStorage.loadSession(sessionId);
    diagnostic.sessionStorage = {
      status: "accessible",
      sessionExists: !!testSession,
      sessionId: sessionId,
    };
  } catch (sessionError) {
    diagnostic.sessionStorage = {
      status: "error",
      error: sessionError.message,
    };
  }
  
  return diagnostic;
};

export default function FullDiagnostic() {
  const data = useLoaderData<typeof loader>();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
      case "connected":
      case "accessible":
        return { bg: "#d4edda", border: "#c3e6cb" };
      case "redirect":
        return { bg: "#fff3cd", border: "#ffeaa7" };
      case "error":
        return { bg: "#f8d7da", border: "#f5c6cb" };
      default:
        return { bg: "#e2e3e5", border: "#d6d8db" };
    }
  };
  
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", maxWidth: "1200px" }}>
      <h1>🔍 Comprehensive Shopify App Diagnostic</h1>
      <p><strong>Timestamp:</strong> {data.timestamp}</p>
      
      {/* Environment Check */}
      <div style={{ marginBottom: "20px" }}>
        <h2>🌍 Environment Configuration</h2>
        <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "5px" }}>
          {Object.entries(data.environment).map(([key, value]) => (
            <p key={key}><strong>{key}:</strong> {value || "NOT SET"}</p>
          ))}
        </div>
      </div>
      
      {/* Shopify Config Check */}
      <div style={{ marginBottom: "20px" }}>
        <h2>⚙️ Shopify Configuration</h2>
        <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "5px" }}>
          {Object.entries(data.shopifyConfig).map(([key, value]) => (
            <p key={key}><strong>{key}:</strong> {Array.isArray(value) ? value.join(", ") : value || "NOT SET"}</p>
          ))}
        </div>
      </div>
      
      {/* Database Check */}
      <div style={{ marginBottom: "20px" }}>
        <h2>🗄️ Database Connection</h2>
        <div style={{ 
          ...getStatusColor(data.database.status),
          padding: "15px", 
          borderRadius: "5px",
          border: `1px solid ${getStatusColor(data.database.status).border}`
        }}>
          <p><strong>Status:</strong> {data.database.status.toUpperCase()}</p>
          {data.database.error && <p><strong>Error:</strong> {data.database.error}</p>}
        </div>
      </div>
      
      {/* Authentication Check */}
      <div style={{ marginBottom: "20px" }}>
        <h2>🔐 Authentication Status</h2>
        <div style={{ 
          ...getStatusColor(data.authentication.status),
          padding: "15px", 
          borderRadius: "5px",
          border: `1px solid ${getStatusColor(data.authentication.status).border}`
        }}>
          <p><strong>Status:</strong> {data.authentication.status.toUpperCase()}</p>
          {data.authentication.message && <p><strong>Message:</strong> {data.authentication.message}</p>}
          {data.authentication.shop && <p><strong>Shop:</strong> {data.authentication.shop}</p>}
          {data.authentication.redirectUrl && (
            <p><strong>Redirect URL:</strong> {data.authentication.redirectUrl}</p>
          )}
          {data.authentication.statusCode && (
            <p><strong>Status Code:</strong> {data.authentication.statusCode}</p>
          )}
        </div>
      </div>
      
      {/* Session Storage Check */}
      <div style={{ marginBottom: "20px" }}>
        <h2>💾 Session Storage</h2>
        <div style={{ 
          ...getStatusColor(data.sessionStorage.status),
          padding: "15px", 
          borderRadius: "5px",
          border: `1px solid ${getStatusColor(data.sessionStorage.status).border}`
        }}>
          <p><strong>Status:</strong> {data.sessionStorage.status.toUpperCase()}</p>
          {data.sessionStorage.sessionExists !== undefined && (
            <p><strong>Session Exists:</strong> {data.sessionStorage.sessionExists ? "Yes" : "No"}</p>
          )}
          {data.sessionStorage.sessionId && <p><strong>Session ID:</strong> {data.sessionStorage.sessionId}</p>}
          {data.sessionStorage.error && <p><strong>Error:</strong> {data.sessionStorage.error}</p>}
        </div>
      </div>
      
      {/* Request Details */}
      <details style={{ marginBottom: "20px" }}>
        <summary><strong>📋 Request Details</strong></summary>
        <pre style={{ background: "#f5f5f5", padding: "10px", overflow: "auto" }}>
          {JSON.stringify(data.request, null, 2)}
        </pre>
      </details>
      
      {/* Recommendations */}
      <div style={{ padding: "15px", background: "#e7f3ff", border: "1px solid #b8daff", borderRadius: "5px" }}>
        <h3>🔧 Recommendations</h3>
        {data.authentication.status === "redirect" && (
          <p>✅ Authentication is working - app is properly redirecting for OAuth</p>
        )}
        {data.authentication.status === "error" && (
          <p>❌ Authentication error - check API keys and configuration</p>
        )}
        {data.database.status === "error" && (
          <p>❌ Database error - check connection URLs and network access</p>
        )}
        {data.sessionStorage.status === "error" && (
          <p>❌ Session storage error - check database schema and permissions</p>
        )}
      </div>
    </div>
  );
}