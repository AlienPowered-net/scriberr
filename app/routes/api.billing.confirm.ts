import { json, redirect } from "@remix-run/node";
import shopify from "../shopify.server";
import { prisma } from "../utils/db.server";
import {
  fetchSubscription,
  mapSubscriptionStatus,
} from "../../src/lib/shopify/billing";

const SUCCESS_REDIRECT_PATH = "/app/settings/billing/success";

export const loader = async ({ request }: { request: Request }) => {
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

    await prisma.$transaction(async (tx) => {
      try {
        const shop = await tx.shop.upsert({
          where: { domain: session.shop },
          update: { plan: "PRO" },
          create: { domain: session.shop },
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

