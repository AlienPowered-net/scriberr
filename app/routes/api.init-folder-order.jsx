import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";
import { prisma } from "../utils/db.server";
import { getOrCreateShopId } from "../utils/tenant.server";

export async function action({ request }) {
  const { session } = await shopify.authenticate.admin(request);
  const shopId = await getOrCreateShopId(session.shop);

  // Get all folders for this shop ordered by creation date
  const folders = await prisma.folder.findMany({
    where: { shopId },
    orderBy: { createdAt: "desc" },
  });

  // Update each folder with an order value (newest first)
  for (let i = 0; i < folders.length; i++) {
    await prisma.folder.update({
      where: { id: folders[i].id },
      data: { order: folders.length - i },
    });
  }

  return json({ success: true, updated: folders.length });
}