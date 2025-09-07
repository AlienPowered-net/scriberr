import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  return {
    currentUrl: url.toString(),
    hostname: url.hostname,
    protocol: url.protocol,
    port: url.port,
    environment: {
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
      SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
      APP_URL: process.env.APP_URL,
    },
    headers: {
      host: request.headers.get('host'),
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
      'x-vercel-deployment-url': request.headers.get('x-vercel-deployment-url'),
    },
    analysis: {
      isCustomDomain: url.hostname === 'scriberrdev.vercel.app',
      isPreviewUrl: url.hostname.includes('scriberr-') && url.hostname.includes('alienpowered.vercel.app'),
      shouldUseCustomDomain: process.env.VERCEL_GIT_COMMIT_REF === 'dev',
    },
    timestamp: new Date().toISOString()
  };
};

export default function DomainCheck() {
  const data = useLoaderData<typeof loader>();
  
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>🌐 Domain Configuration Check</h1>
      
      <div style={{ marginBottom: "20px" }}>
        <h2>📍 Current Request</h2>
        <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "5px" }}>
          <p><strong>Current URL:</strong> {data.currentUrl}</p>
          <p><strong>Hostname:</strong> {data.hostname}</p>
          <p><strong>Protocol:</strong> {data.protocol}</p>
          {data.port && <p><strong>Port:</strong> {data.port}</p>}
        </div>
      </div>
      
      <div style={{ marginBottom: "20px" }}>
        <h2>🌍 Environment Variables</h2>
        <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "5px" }}>
          {Object.entries(data.environment).map(([key, value]) => (
            <p key={key}><strong>{key}:</strong> {value || "NOT SET"}</p>
          ))}
        </div>
      </div>
      
      <div style={{ marginBottom: "20px" }}>
        <h2>📋 Request Headers</h2>
        <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "5px" }}>
          {Object.entries(data.headers).map(([key, value]) => (
            <p key={key}><strong>{key}:</strong> {value || "NOT SET"}</p>
          ))}
        </div>
      </div>
      
      <div style={{ marginBottom: "20px" }}>
        <h2>🔍 Domain Analysis</h2>
        <div style={{ 
          background: data.analysis.isCustomDomain ? "#d4edda" : "#f8d7da",
          padding: "15px", 
          borderRadius: "5px",
          border: `1px solid ${data.analysis.isCustomDomain ? "#c3e6cb" : "#f5c6cb"}`
        }}>
          <p><strong>Is Custom Domain (scriberrdev.vercel.app):</strong> {data.analysis.isCustomDomain ? "✅ Yes" : "❌ No"}</p>
          <p><strong>Is Preview URL:</strong> {data.analysis.isPreviewUrl ? "⚠️ Yes" : "✅ No"}</p>
          <p><strong>Should Use Custom Domain:</strong> {data.analysis.shouldUseCustomDomain ? "✅ Yes" : "❌ No"}</p>
        </div>
      </div>
      
      {!data.analysis.isCustomDomain && data.analysis.shouldUseCustomDomain && (
        <div style={{ padding: "15px", background: "#fff3cd", border: "1px solid #ffeaa7", borderRadius: "5px" }}>
          <h3>⚠️ Domain Configuration Issue</h3>
          <p>Your dev environment is using a preview URL instead of the custom domain.</p>
          <p><strong>Current:</strong> {data.hostname}</p>
          <p><strong>Expected:</strong> scriberrdev.vercel.app</p>
          
          <h4>🔧 Fix in Vercel Dashboard:</h4>
          <ol>
            <li>Go to Project Settings → Domains</li>
            <li>Ensure <code>scriberrdev.vercel.app</code> is assigned to the <strong>dev environment</strong></li>
            <li>Check that it's not using preview/branch URLs</li>
            <li>Redeploy after fixing domain configuration</li>
          </ol>
        </div>
      )}
      
      <details>
        <summary>Full Debug Data</summary>
        <pre style={{ background: "#f5f5f5", padding: "10px", overflow: "auto" }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}