import { authenticate } from "../shopify.server";
import { downgradeShopToFreeByDomain } from "~/lib/plan.server";

// IMPORTANT: no default export, no meta/links/components here

export const action = async ({ request }) => {
  // This authenticates the webhook and gives you topic/shop/payload
  const { shop, topic, payload } = await authenticate.webhook(request);

  // Downgrade shop to FREE plan and mark subscriptions as CANCELED
  // Shopify cancels RAC automatically on uninstall, so we reflect that in our DB
  if (!shop) {
    console.error("[App Uninstalled] Missing shop domain in webhook");
  } else {
    await downgradeShopToFreeByDomain(shop);
  }

  return new Response("OK");
};

// If you happen to export a loader, keep it trivial and
// DO NOT import server code at module scope.
export const loader = () => new Response(null, { status: 405 });
