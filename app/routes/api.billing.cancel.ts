// app/routes/api.billing.cancel.ts
// Cancels the merchant's PRO subscription at the end of the current billing period

import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  // Dynamic imports for server-only modules
  const [shopifyModule, { prisma }] = await Promise.all([
    import("../shopify.server"),
    import("../utils/db.server"),
  ]);

  const shopify = shopifyModule.default;
  const apiVersion = shopifyModule.apiVersion;

  try {
    const { session } = await shopify.authenticate.admin(request);

    if (!session?.shop) {
      return json({ error: "Shop session not found" }, { status: 401 });
    }

    const shopDomain = session.shop;

    console.log("[Billing Cancel] Cancellation requested", { shopDomain });

    // Find the shop and its subscription
    const shop = await prisma.shop.findUnique({
      where: { domain: shopDomain },
      include: { subscription: true },
    });

    if (!shop) {
      console.error("[Billing Cancel] Shop not found", { shopDomain });
      return json({ error: "Shop not found" }, { status: 404 });
    }

    const subscription = shop.subscription;

    if (!subscription || subscription.status !== "ACTIVE") {
      console.warn("[Billing Cancel] No active subscription to cancel", {
        shopDomain,
        subscriptionStatus: subscription?.status ?? null,
      });
      return json(
        { error: "No active subscription to cancel" },
        { status: 400 }
      );
    }

    // Parse the charge ID from shopifySubGid
    // Format: gid://shopify/RecurringApplicationCharge/12345
    const shopifySubGid = subscription.shopifySubGid;
    if (!shopifySubGid) {
      console.error("[Billing Cancel] Missing Shopify charge ID", {
        shopDomain,
        subscriptionId: subscription.id,
      });
      return json(
        { error: "Missing Shopify subscription reference" },
        { status: 400 }
      );
    }

    // Extract numeric charge ID
    const chargeIdMatch = shopifySubGid.match(/\/(\d+)$/);
    if (!chargeIdMatch) {
      console.error("[Billing Cancel] Invalid Shopify GID format", {
        shopifySubGid,
      });
      return json(
        { error: "Invalid subscription reference format" },
        { status: 400 }
      );
    }

    const chargeId = chargeIdMatch[1];

    console.log("[Billing Cancel] Canceling charge via REST API", {
      shopDomain,
      chargeId,
      shopifySubGid,
    });

    // Call Shopify REST API to cancel the recurring application charge
    const endpoint = `https://${shopDomain}/admin/api/${apiVersion}/recurring_application_charges/${chargeId}.json`;

    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        "X-Shopify-Access-Token": session.accessToken!,
      },
    });

    console.log("[Billing Cancel] Shopify REST response", {
      status: response.status,
      ok: response.ok,
    });

    if (!response.ok && response.status !== 200) {
      // 200 is success for DELETE, some APIs return 204
      if (response.status !== 204) {
        let errorBody = "";
        try {
          errorBody = await response.text();
        } catch {
          // ignore
        }
        console.error("[Billing Cancel] Shopify API error", {
          status: response.status,
          body: errorBody,
        });
        return json(
          { error: "Failed to cancel subscription with Shopify" },
          { status: 500 }
        );
      }
    }

    // Calculate accessUntil - when the current billing period ends
    // Use billing_on if available, otherwise calculate from createdAt + 30 days
    let accessUntil: Date;

    // For recurring charges, Shopify bills every 30 days
    // We calculate the next billing date based on when the subscription was created
    const subscriptionCreatedAt = new Date(subscription.createdAt);
    const now = new Date();

    // Calculate how many 30-day periods have passed
    const daysSinceCreation = Math.floor(
      (now.getTime() - subscriptionCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const completedPeriods = Math.floor(daysSinceCreation / 30);

    // The current period ends at (completedPeriods + 1) * 30 days from creation
    accessUntil = new Date(subscriptionCreatedAt);
    accessUntil.setDate(accessUntil.getDate() + (completedPeriods + 1) * 30);

    // If trialEndsAt is set and is in the future, use that as access end
    if (subscription.trialEndsAt) {
      const trialEnd = new Date(subscription.trialEndsAt);
      if (trialEnd > now && trialEnd > accessUntil) {
        accessUntil = trialEnd;
      }
    }

    console.log("[Billing Cancel] Calculated access period end", {
      subscriptionCreatedAt,
      completedPeriods,
      accessUntil,
    });

    // Update subscription in database
    // Mark as CANCELED but set accessUntil so they keep PRO access until then
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "CANCELED",
        accessUntil,
      },
    });

    // Note: We do NOT update shop.plan to FREE here
    // The plan guard in withPlanContext will handle that after accessUntil passes

    console.info("[Billing Cancel] Subscription canceled successfully", {
      shopDomain,
      shopId: shop.id,
      subscriptionId: subscription.id,
      accessUntil: accessUntil.toISOString(),
    });

    return json({
      ok: true,
      accessUntil: accessUntil.toISOString(),
      message: `Your subscription has been canceled. You'll keep access to Pro features until ${accessUntil.toLocaleDateString()}.`,
    });
  } catch (error: any) {
    console.error("[Billing Cancel] Unexpected error", error);
    return json(
      { error: "Unable to cancel subscription. Please try again or contact support." },
      { status: 500 }
    );
  }
};

// Reject other HTTP methods
export const loader = () => {
  return json({ error: "Method not allowed" }, { status: 405 });
};

