import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Get database URL info without exposing credentials
    const databaseUrl = process.env.SCRIBERRNOTE_DEV_DATABASE_URL || process.env.SCRIBERRNOTE_DATABASE_URL;
    const directUrl = process.env.SCRIBERRNOTE_DEV_DIRECT_URL || process.env.SCRIBERRNOTE_DIRECT_URL;
    
    // Parse URL to get connection info (without credentials)
    let dbInfo = "Not available";
    let directInfo = "Not available";
    
    if (databaseUrl) {
      try {
        const url = new URL(databaseUrl);
        dbInfo = `${url.protocol}//${url.hostname}:${url.port || 'default'}${url.pathname}`;
      } catch (e) {
        dbInfo = "Invalid URL format";
      }
    }
    
    if (directUrl) {
      try {
        const url = new URL(directUrl);
        directInfo = `${url.protocol}//${url.hostname}:${url.port || 'default'}${url.pathname}`;
      } catch (e) {
        directInfo = "Invalid URL format";
      }
    }
    
    return {
      status: "info",
      message: "Database connection analysis (no actual connection attempted)",
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        isDevEnvironment: process.env.VERCEL_ENV === 'development' || 
                         process.env.VERCEL_GIT_COMMIT_REF === 'dev' ||
                         process.env.VERCEL_URL?.includes('scriberrdev'),
      },
      databaseConfig: {
        mainDatabaseUrl: process.env.SCRIBERRNOTE_DATABASE_URL ? "SET" : "NOT SET",
        devDatabaseUrl: process.env.SCRIBERRNOTE_DEV_DATABASE_URL ? "SET" : "NOT SET",
        directUrl: process.env.SCRIBERRNOTE_DIRECT_URL ? "SET" : "NOT SET",
        devDirectUrl: process.env.SCRIBERRNOTE_DEV_DIRECT_URL ? "SET" : "NOT SET",
      },
      connectionInfo: {
        selectedDatabase: dbInfo,
        selectedDirect: directInfo,
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

export default function DbTest() {
  const data = useLoaderData<typeof loader>();
  
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Database Configuration Test</h1>
      <div style={{ 
        background: data.status === "error" ? "#f8d7da" : "#d1ecf1", 
        padding: "15px", 
        border: `1px solid ${data.status === "error" ? "#f5c6cb" : "#bee5eb"}`,
        borderRadius: "5px",
        marginBottom: "20px"
      }}>
        <h2>Status: {data.status.toUpperCase()}</h2>
        <p><strong>Message:</strong> {data.message}</p>
      </div>
      
      {data.environment && (
        <div style={{ marginBottom: "20px" }}>
          <h3>🌍 Environment</h3>
          <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "5px" }}>
            <p><strong>NODE_ENV:</strong> {data.environment.NODE_ENV}</p>
            <p><strong>VERCEL_ENV:</strong> {data.environment.VERCEL_ENV}</p>
            <p><strong>Is Dev Environment:</strong> {data.environment.isDevEnvironment ? "✅ Yes" : "❌ No"}</p>
          </div>
        </div>
      )}
      
      {data.databaseConfig && (
        <div style={{ marginBottom: "20px" }}>
          <h3>🗄️ Database Configuration</h3>
          <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "5px" }}>
            <p><strong>Main Database URL:</strong> {data.databaseConfig.mainDatabaseUrl}</p>
            <p><strong>Dev Database URL:</strong> {data.databaseConfig.devDatabaseUrl}</p>
            <p><strong>Direct URL:</strong> {data.databaseConfig.directUrl}</p>
            <p><strong>Dev Direct URL:</strong> {data.databaseConfig.devDirectUrl}</p>
          </div>
        </div>
      )}
      
      {data.connectionInfo && (
        <div style={{ marginBottom: "20px" }}>
          <h3>🔗 Connection Info (Credentials Hidden)</h3>
          <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "5px" }}>
            <p><strong>Selected Database:</strong> {data.connectionInfo.selectedDatabase}</p>
            <p><strong>Selected Direct:</strong> {data.connectionInfo.selectedDirect}</p>
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
        <h3>🔧 Next Steps</h3>
        <ol>
          <li>Verify the database URLs are correct</li>
          <li>Check that the Neon database is accessible</li>
          <li>Ensure connection limits aren't exceeded</li>
          <li>Test with a simple database connection</li>
        </ol>
      </div>
    </div>
  );
}