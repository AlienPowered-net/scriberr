import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider  } from "@shopify/shopify-app-remix/react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import "@shopify/polaris/build/esm/styles.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { flagsFor } from "../../src/lib/featureFlags";
import { withPlanContext } from "../utils/ensurePlan.server";
import { UpgradeModal } from "../../src/components/UpgradeModal";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  try {
    const loadWithPlan = withPlanContext(async ({ planContext }) => {
      return {
        apiKey: process.env.SHOPIFY_API_KEY || "",
        plan: planContext.plan,
        flags: flagsFor(planContext.plan, {
          versionLimit: planContext.versionLimit,
          noteLimit: planContext.noteLimit,
          folderLimit: planContext.folderLimit,
        }),
        subscriptionStatus: planContext.subscriptionStatus,
        accessUntil: planContext.accessUntil?.toISOString() ?? null,
      };
    });

    return await loadWithPlan({ request });
  } catch (error) {
    if (
      error?.message?.includes("session") ||
      error?.message?.includes("table") ||
      error?.message?.includes("relation")
    ) {
      console.error("Database authentication error:", error);
      throw new Response(
        JSON.stringify({
          error: "Database connection issue detected. Please check the database health endpoint.",
          details: error.message,
          suggestion: "Visit /api/db-health?action=repair to attempt automatic repair",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    throw error;
  }
};

export default function App() {
  const { apiKey, flags, plan, subscriptionStatus, accessUntil } = useLoaderData();
  const [upgradePrompt, setUpgradePrompt] = useState(null);
  const [upgradeSubmitting, setUpgradeSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      if (response.status === 403) {
        try {
          const cloned = response.clone();
          const payload = await cloned.json();

          if (payload?.upgradeHint) {
            const now = Date.now();
            const lastShownRaw =
              typeof sessionStorage !== "undefined"
                ? sessionStorage.getItem("scriberr-upgrade-last-shown")
                : null;
            const lastShown = lastShownRaw ? Number(lastShownRaw) : 0;

            if (!lastShown || now - lastShown > 60_000) {
              setUpgradePrompt({
                code: payload.error,
                message: payload.message,
              });

              if (typeof sessionStorage !== "undefined") {
                sessionStorage.setItem(
                  "scriberr-upgrade-last-shown",
                  String(now),
                );
              }
            }
          }
        } catch (error) {
          console.debug("Failed to parse plan error response", error);
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const openUpgradeModal = useCallback(
    (payload) => {
      setUpgradePrompt(
        payload ?? {
          code: "LIMIT_REACHED",
          message:
            "Upgrade to unlock Pro features, unlimited notes, and full contact management.",
        },
      );
    },
    [],
  );

  const handleUpgrade = useCallback(async () => {
    try {
      setUpgradeSubmitting(true);
      const response = await fetch("/api/billing/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to initiate upgrade");
      }

      const payload = await response.json();
      console.log("[App] Upgrade response:", payload);
      
      if (payload?.confirmationUrl) {
        // For Shopify embedded apps, redirect the parent window to the confirmation URL
        // The confirmation URL is a Shopify admin page, so we need to navigate the top-level window
        try {
          // Try to redirect the parent window (for embedded apps)
          if (window.top && window.top !== window) {
            window.top.location.href = payload.confirmationUrl;
          } else {
            // Fallback to current window if not embedded
            window.location.href = payload.confirmationUrl;
          }
        } catch (error) {
          // If cross-origin restriction, open in new window
          console.warn("[App] Cross-origin redirect blocked, opening in new window:", error);
          window.open(payload.confirmationUrl, "_blank");
        }
      } else {
        console.error("[App] Missing confirmation URL in response:", payload);
        throw new Error("Missing confirmation URL");
      }
    } catch (error) {
      console.error("[App] Upgrade initiation failed:", error);
      setUpgradePrompt((current) => ({
        code: "UPGRADE_FAILED",
        message:
          error.message || "We couldn't start the upgrade flow. Please try again or contact support.",
        ...(current ?? {}),
      }));
    } finally {
      setUpgradeSubmitting(false);
    }
  }, []);

  const modalHeadline = useMemo(() => {
    // For over_limit_edit context, use the default headline from the modal
    if (upgradePrompt?.context === "over_limit_edit") {
      return undefined;
    }
    if (!upgradePrompt?.message) {
      return "Ready for Scriberr Pro? Unlock all premium features with one click.";
    }
    return upgradePrompt.message;
  }, [upgradePrompt]);

  const modalContext = upgradePrompt?.context ?? "default";

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <ui-nav-menu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/dashboard">Dashboard</Link>
        {flags.contactsEnabled ? (
          <Link to="/app/contacts">Contacts</Link>
        ) : null}
        <Link to="/app/settings">Settings</Link>
      </ui-nav-menu>
      <Outlet context={{ plan, flags, openUpgradeModal, subscriptionStatus, accessUntil }} />
      <UpgradeModal
        open={Boolean(upgradePrompt)}
        onClose={() => setUpgradePrompt(null)}
        onUpgrade={handleUpgrade}
        isSubmitting={upgradeSubmitting}
        headline={modalHeadline}
        currentPlan={plan}
        context={modalContext}
      />
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
