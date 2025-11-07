import { json } from "@remix-run/node";
import shopify from "../shopify.server";
import { createProSubscription } from "../../src/lib/shopify/billing";

export const action = async ({ request }: { request: Request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

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

    const testMode =
      process.env.SHOPIFY_BILLING_TEST_MODE !== "false" &&
      process.env.NODE_ENV !== "production";

    const returnUrl = new URL("/api/billing/confirm", appUrl).toString();
    const { confirmationUrl } = await createProSubscription(admin, returnUrl, {
      test: testMode,
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

