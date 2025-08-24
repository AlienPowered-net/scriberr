import { authenticate } from "../shopify.server";

// IMPORTANT: no meta/links/default/component exports here

export const action = async ({ request }) => {
  const { prisma } = await import("../utils/db.server");

  const { shop, topic, payload } = await authenticate.webhook(request);

  // Update anything you need for this shop based on new scopes

  return new Response("OK");
};

export const loader = () => new Response(null, { status: 405 });
