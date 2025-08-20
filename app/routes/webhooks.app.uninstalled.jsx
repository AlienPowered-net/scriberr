import { authenticate } from "../shopify.server";

// IMPORTANT: no default export, no meta/links/components here

export const action = async ({ request }) => {
  // Load server‑only code inside the server handler
  const { prisma } = await import("../db.server");

  // This authenticates the webhook and gives you topic/shop/payload
  const { shop, topic, payload } = await authenticate.webhook(request);

  // Handle the uninstall (example: clean up tenant rows)
  // await prisma.store.delete({ where: { domain: shop } });
  // await prisma.folder.deleteMany({ where: { shopId: ... } });
  // await prisma.note.deleteMany({ where: { shopId: ... } });

  return new Response("OK");
};

// If you happen to export a loader, keep it trivial and
// DO NOT import server code at module scope.
export const loader = () => new Response(null, { status: 405 });
