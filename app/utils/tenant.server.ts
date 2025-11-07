import { getMerchantByShop } from "../../src/server/guards/ensurePlan";

export async function getOrCreateShopId(shopDomain) {
  const merchant = await getMerchantByShop(shopDomain);
  return merchant.id;
}
