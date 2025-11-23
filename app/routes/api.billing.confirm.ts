import { json, redirect } from "@remix-run/node";
import {
  fetchSubscription,
  mapSubscriptionStatus,
} from "../../src/lib/shopify/billing";

const SUCCESS_REDIRECT_PATH = "/app/settings/billing/success";

export const loader = async ({ request }: { request: Request }) => {
  // Dynamic imports for server-only modules
  const [
    shopifyModule,
    { prisma },
  ] = await Promise.all([
    import("../shopify.server"),
    import("../utils/db.server"),
  ]);

  const shopify = shopifyModule.default;

  try {
    const { admin, session } = await shopify.authenticate.admin(request);

    if (!session?.shop) {
      return json({ error: "Shop session not found" }, { status: 401 });
    }

    const url = new URL(request.url);
    const chargeId =
      url.searchParams.get("charge_id") ?? url.searchParams.get("subscription");

    if (!chargeId) {
      return json({ error: "Missing charge identifier" }, { status: 400 });
    }

    const subscriptionGid = chargeId.startsWith("gid://")
      ? chargeId
      : `gid://shopify/AppSubscription/${chargeId}`;

    const subscription = await fetchSubscription(admin, subscriptionGid);

    // Validate subscription is ACTIVE and matches Pro plan requirements
    const subscriptionStatus = mapSubscriptionStatus(subscription.status);
    const isPro =
      subscriptionStatus === "ACTIVE" &&
      subscription.priceAmount === 5 &&
      subscription.currencyCode === "USD" &&
      subscription.billingInterval === "EVERY_30_DAYS";

    if (!isPro) {
      console.warn(
        `Subscription not eligible for Pro plan upgrade. Status: ${subscription.status}, Amount: ${subscription.priceAmount}, Currency: ${subscription.currencyCode}`,
      );
    }

    await prisma.$transaction(async (tx) => {
      try {
        const shop = await tx.shop.upsert({
          where: { domain: session.shop },
          update: { plan: isPro ? "PRO" : "FREE" },
          create: { domain: session.shop, plan: isPro ? "PRO" : "FREE" },
        });

        await tx.subscription.upsert({
          where: { shopId: shop.id },
          create: {
            shopId: shop.id,
            status: mapSubscriptionStatus(subscription.status),
            shopifySubGid: subscription.id,
            name: subscription.name,
            priceAmount: subscription.priceAmount,
            currency: subscription.currencyCode,
            testMode: subscription.test,
            trialEndsAt: subscription.trialEndsAt
              ? new Date(subscription.trialEndsAt)
              : null,
          },
          update: {
            status: mapSubscriptionStatus(subscription.status),
            shopifySubGid: subscription.id,
            name: subscription.name,
            priceAmount: subscription.priceAmount,
            currency: subscription.currencyCode,
            testMode: subscription.test,
            trialEndsAt: subscription.trialEndsAt
              ? new Date(subscription.trialEndsAt)
              : null,
          },
        });
      } catch (error: any) {
        // If plan column or Subscription table doesn't exist, migration hasn't run
        if (error?.code === "P2021" || error?.code === "P2022") {
          throw new Error(
            "Database migration required. Please ensure the plan/subscription migration has been applied.",
          );
        }
        throw error;
      }
    });

    return redirect(SUCCESS_REDIRECT_PATH);
  } catch (error: any) {
    console.error("Failed to confirm billing subscription", error);
    return json(
      { error: "Unable to confirm subscription. Please contact support." },
      { status: 500 },
    );
  }
};
