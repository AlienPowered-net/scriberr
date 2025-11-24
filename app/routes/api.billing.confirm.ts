import { json, redirect } from "@remix-run/node";
import {
  fetchRecurringCharge,
  mapSubscriptionStatus,
} from "../../src/lib/shopify/billing";

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
    
    // Log all incoming URL parameters for debugging
    console.log("[Billing Confirm] Incoming request:", {
      fullUrl: url.toString(),
      allParams: Object.fromEntries(url.searchParams.entries()),
    });
    
    // Extract shop from query params (Shopify includes this in return URL)
    const shopFromQuery = url.searchParams.get("shop");
    
    // Extract charge_id/subscription from query params
    // Note: Shopify sends different parameters depending on the API used:
    // - appSubscriptionCreate (GraphQL): charge_id (numeric ID or full GID)
    // - Some cases might use 'id' with full GID
    const chargeId =
      url.searchParams.get("charge_id") ?? 
      url.searchParams.get("subscription") ??
      url.searchParams.get("id");

    if (!chargeId) {
      console.error("[Billing Confirm] Missing charge identifier in URL params");
      return json({ error: "Missing charge identifier" }, { status: 400 });
    }
    
    console.log("[Billing Confirm] Extracted parameters:", {
      shop: shopFromQuery,
      chargeId,
      isGid: chargeId.startsWith("gid://"),
    });

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
        console.error(
          `[Billing Confirm] No offline session or access token found for shop: ${shop}. Redirecting to auth.`,
        );
        return redirect(`/auth?shop=${encodeURIComponent(shop)}`);
      }

      // Create a minimal Admin GraphQL client using the offline session
      const apiVersion = shopifyModule.apiVersion;
      if (!apiVersion) {
        console.error(
          "[Billing Confirm] Missing apiVersion export from shopifyModule. Redirecting to auth.",
        );
        return redirect(`/auth?shop=${encodeURIComponent(session.shop)}`);
      }

      console.log(
        "[Billing Confirm] Using offline admin GraphQL client for billing confirmation",
        { shop: session.shop, apiVersion },
      );

      admin = {
        graphql: async (query: string, options?: { variables?: Record<string, unknown> }) => {
          const endpoint = `https://${session.shop}/admin/api/${apiVersion}/graphql.json`;
          const body = {
            query,
            variables: options?.variables ?? undefined,
          };

          console.log("[Billing Confirm] Making GraphQL request:", {
            endpoint,
            hasVariables: Boolean(options?.variables),
            variables: options?.variables,
          });

          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": session.accessToken,
            },
            body: JSON.stringify(body),
          });

          console.log("[Billing Confirm] GraphQL response status:", {
            status: response.status,
            ok: response.ok,
            statusText: response.statusText,
          });

          return response;
        },
        rest: {
          get: async ({ path }: { path: string }) => {
            const endpoint = `https://${session.shop}/admin/api/${apiVersion}/${path}`;
            
            console.log("[Billing Confirm] Making REST GET request:", {
              endpoint,
              path,
            });

            const response = await fetch(endpoint, {
              method: "GET",
              headers: {
                "X-Shopify-Access-Token": session.accessToken,
              },
            });

            console.log("[Billing Confirm] REST response status:", {
              status: response.status,
              ok: response.ok,
            });

            const body = await response.json();
            return { status: response.status, body };
          },
        },
      };
    }

    if (!session?.shop || !admin) {
      console.error("[Billing Confirm] Missing admin client or session.shop after authentication fallback", {
        hasSession: Boolean(session),
        hasAdmin: Boolean(admin),
        shop: session?.shop ?? shopFromQuery,
      });
      return json({ error: "Shop session not found" }, { status: 401 });
    }

    console.log("[Billing Confirm] Fetching recurring charge:", {
      chargeId,
      shop: session.shop,
    });

    const charge = await fetchRecurringCharge(admin, chargeId);

    // Check if charge is active
    if (charge.status !== "active") {
      console.error("[Billing Confirm] Charge not active:", {
        id: charge.id,
        status: charge.status,
        name: charge.name,
      });
      
      return json(
        { 
          error: `Subscription is not active. Status: ${charge.status}`,
          status: charge.status,
        },
        { status: 400 }
      );
    }

    console.log("[Billing Confirm] Charge is active, marking shop as Pro");

    const isPro = true; // Already validated charge.status === "active"

    await prisma.$transaction(async (tx) => {
      try {
        const shop = await tx.shop.upsert({
          where: { domain: session.shop },
          update: { plan: "PRO" },
          create: { domain: session.shop, plan: "PRO" },
        });

        await tx.subscription.upsert({
          where: { shopId: shop.id },
          create: {
            shopId: shop.id,
            status: "ACTIVE",
            shopifySubGid: `gid://shopify/RecurringApplicationCharge/${charge.id}`,
            name: charge.name,
            priceAmount: parseFloat(charge.price),
            currency: charge.currency_code || "USD",
            testMode: charge.test,
            trialEndsAt: charge.trial_ends_on ? new Date(charge.trial_ends_on) : null,
          },
          update: {
            status: "ACTIVE",
            shopifySubGid: `gid://shopify/RecurringApplicationCharge/${charge.id}`,
            name: charge.name,
            priceAmount: parseFloat(charge.price),
            currency: charge.currency_code || "USD",
            testMode: charge.test,
            trialEndsAt: charge.trial_ends_on ? new Date(charge.trial_ends_on) : null,
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

    // Redirect to auth with shop param to seamlessly re-enter the embedded app
    // The auth route will handle OAuth and redirect back into the embedded app
    const shop = session?.shop ?? shopFromQuery;

    if (!shop) {
      console.error("[Billing Confirm] No shop available for redirect");
      return json({ error: "Unable to redirect - missing shop information" }, { status: 500 });
    }

    const redirectUrl = `/auth?shop=${encodeURIComponent(shop)}`;
    
    console.log("[Billing Confirm] Final redirect decision", {
      shop,
      redirectUrl,
      sessionShop: session?.shop,
      shopFromQuery,
    });

    return redirect(redirectUrl);
  } catch (error: any) {
    console.error("Failed to confirm billing subscription", error);
    return json(
      { error: "Unable to confirm subscription. Please contact support." },
      { status: 500 },
    );
  }
};
