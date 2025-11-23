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
    const url = new URL(request.url);
    
    // Extract shop from query params (Shopify includes this in return URL)
    const shopFromQuery = url.searchParams.get("shop");
    
    // Extract charge_id/subscription from query params
    const chargeId =
      url.searchParams.get("charge_id") ?? url.searchParams.get("subscription");

    if (!chargeId) {
      return json({ error: "Missing charge identifier" }, { status: 400 });
    }

    let session;
    let admin;

    // Try to authenticate with admin first (works if session cookies are present)
    try {
      const authResult = await shopify.authenticate.admin(request);
      session = authResult.session;
      admin = authResult.admin;
      
      if (!session?.shop) {
        throw new Error("No shop in authenticated session");
      }
    } catch (authError) {
      // If admin authentication fails (common when returning from external redirect),
      // manually load the session from the database
      console.log("[Billing Confirm] Admin auth failed, loading session manually");
      
      // Get shop from query param or try to find it from the charge_id
      let shop = shopFromQuery;
      
      if (!shop) {
        // If shop not in query params, try to find it from existing subscriptions in DB
        const subscriptionGid = chargeId.startsWith("gid://")
          ? chargeId
          : `gid://shopify/AppSubscription/${chargeId}`;
        
        // Try to find shop from existing subscription record
        const existingSub = await prisma.subscription.findFirst({
          where: { shopifySubGid: subscriptionGid },
          include: { shop: true },
        });
        
        if (existingSub?.shop) {
          shop = existingSub.shop.domain;
        } else {
          // Last resort: try to find any recent session or require shop param
          return json(
            { error: "Shop parameter required for billing confirmation. Please include ?shop=your-shop.myshopify.com in the URL." },
            { status: 400 },
          );
        }
      }

      // Load offline session from database
      const sessionId = `offline_${shop}`;
      session = await shopify.sessionStorage.loadSession(sessionId);
      
      if (!session || !session.accessToken) {
        console.error(`[Billing Confirm] No session or access token found for shop: ${shop}`);
        return json(
          { error: "Session not found. Please try logging in again." },
          { status: 401 },
        );
      }

      // Create admin GraphQL client using the new GraphQL client from shopify-api
      const { GraphqlClient } = await import("@shopify/shopify-api");
      
      admin = new GraphqlClient({
        session,
      });
    }

    if (!session?.shop || !admin) {
      return json({ error: "Shop session not found" }, { status: 401 });
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
