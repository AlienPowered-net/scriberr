import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, payload } = await authenticate.webhook(request);
  const { syncManagedSubscription } = await import(
    "../utils/plan-service.server"
  );

  try {
    await syncManagedSubscription(shop, payload);
    return new Response("OK");
  } catch (error) {
    console.error("Failed to sync managed subscription", {
      shop,
      error,
    });
    return new Response("Subscription sync failed", { status: 500 });
  }
};

export const loader = () => new Response(null, { status: 405 });
