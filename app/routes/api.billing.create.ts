import { json } from "@remix-run/node";
import { createProSubscription } from "../../src/lib/shopify/billing";

export const action = async ({ request }: { request: Request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  // Dynamic imports for server-only modules
  const [shopifyModule] = await Promise.all([
    import("../shopify.server"),
  ]);

  const shopify = shopifyModule.default;

  try {
    const { admin, session } = await shopify.authenticate.admin(request);

    if (!session?.shop) {
      return json({ error: "Shop session not found" }, { status: 401 });
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.SHOPIFY_APP_URL ||
      process.env.APP_URL;

    if (!appUrl) {
      console.error("Missing NEXT_PUBLIC_APP_URL / SHOPIFY_APP_URL / APP_URL");
      return json(
        {
          error: "App URL is not configured. Please set NEXT_PUBLIC_APP_URL.",
        },
        { status: 500 },
      );
    }

    // For labs environment, ensure test mode is enabled unless explicitly disabled
    // Test mode should be true for all non-production environments
    const testMode =
      process.env.SHOPIFY_BILLING_TEST_MODE !== "false" &&
      process.env.NODE_ENV !== "production";

    console.log("[Billing Create] Environment:", {
      NODE_ENV: process.env.NODE_ENV,
      SHOPIFY_BILLING_TEST_MODE: process.env.SHOPIFY_BILLING_TEST_MODE,
      testMode,
      appUrl,
      shop: session.shop,
    });

    // Include shop parameter in return URL to help with authentication
    const returnUrlObj = new URL("/api/billing/confirm", appUrl);
    returnUrlObj.searchParams.set("shop", session.shop);
    const returnUrl = returnUrlObj.toString();

    console.log("[Billing Create] Using returnUrl for subscription:", {
      returnUrl,
      shop: session.shop,
    });

    const { confirmationUrl } = await createProSubscription(admin, returnUrl, {
      test: testMode,
      name: "Scriberr Pro – $5/month",
    });

    return json({ confirmationUrl });
  } catch (error: any) {
    console.error("Failed to create billing subscription", error);
    return json(
      {
        error: "Unable to initiate upgrade. Please try again.",
      },
      { status: 500 },
    );
  }
};
