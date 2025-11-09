import { getMerchantByShop } from "./ensurePlan.server";

export async function getOrCreateShopId(shopDomain) {
  const merchant = await getMerchantByShop(shopDomain);
  return merchant.id;
}
