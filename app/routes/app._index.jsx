// app/routes/app._index.jsx
import { json, redirect } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

export const loader = async ({ request }) => {
  // Try to authenticate the admin request
  const auth = await shopify.authenticate.admin(request).catch(() => null);

  // Support both shapes returned by different @shopify/shopify-app-remix versions
  const session =
    auth?.session ?? auth?.admin?.session ?? null;
  const shop = session?.shop;

  // If there is no session/shop, send the user through OAuth again
  if (!shop) {
    // If you have the shop param in the URL, keep it; otherwise Shopify adds it
    return redirect("/auth/login");
  }

  const shopId = await getOrCreateShopId(shop);

  const [folders, notes] = await Promise.all([
    prisma.folder.findMany({ where: { shopId }, orderBy: { name: "asc" } }),
    prisma.note.findMany({ where: { shopId }, orderBy: { updatedAt: "desc" } }),
  ]);

  return json({ folders, notes });
};
