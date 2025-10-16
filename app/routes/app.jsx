import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider  } from "@shopify/shopify-app-remix/react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import "@shopify/polaris/build/esm/styles.css";


export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  try {
    await authenticate.admin(request);
    return { apiKey: process.env.SHOPIFY_API_KEY || "" };
  } catch (error) {
    // If authentication fails due to database issues, provide helpful error
    if (error.message?.includes('session') || error.message?.includes('table') || error.message?.includes('relation')) {
      console.error("Database authentication error:", error);
      throw new Response(
        JSON.stringify({
          error: "Database connection issue detected. Please check the database health endpoint.",
          details: error.message,
          suggestion: "Visit /api/db-health?action=repair to attempt automatic repair"
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    throw error;
  }
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <ui-nav-menu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/dashboard">Dashboard</Link>
        <Link to="/app/contacts">Contacts</Link>
        <Link to="/app/settings">Settings</Link>
      </ui-nav-menu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
