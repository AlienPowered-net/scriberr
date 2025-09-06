import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  return {
    url: url.toString(),
    host: url.host,
    pathname: url.pathname,
    searchParams: Object.fromEntries(url.searchParams),
    headers: Object.fromEntries(request.headers),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY ? "SET" : "NOT SET",
      SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
      APP_URL: process.env.APP_URL,
    },
    timestamp: new Date().toISOString()
  };
};

export default function Debug() {
  const data = useLoaderData<typeof loader>();
  
  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h1>Debug Information</h1>
      <pre style={{ background: "#f5f5f5", padding: "10px", overflow: "auto" }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}