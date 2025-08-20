import { prisma } from "../utils/db.server";

export async function getOrCreateShopId(shopDomain) {
  const shop = await prisma.shop.upsert({
    where: { domain: shopDomain },
    update: {},
    create: { domain: shopDomain },
    select: { id: true },
  });
  return shop.id;
}
