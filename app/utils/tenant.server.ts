import {
  ensurePlan,
  getShopWithPlanByDomain,
  getShopWithPlanById,
  upsertShopWithPlan,
  isPlanAccessError,
  buildPlanAccessErrorBody,
  PlanAccessError,
  serializePlanContext,
  type EnsurePlanOptions,
  type EnsurePlanResult,
  type ShopPlanRecord,
  type PlanUsageSummary,
  type PlanSnapshotPayload,
  type SerializedPlanContext,
} from "./plan-service.server";

export async function getOrCreateShop(
  shopDomain: string,
): Promise<ShopPlanRecord> {
  return upsertShopWithPlan(shopDomain);
}

export async function getOrCreateShopId(shopDomain: string): Promise<string> {
  const shop = await getOrCreateShop(shopDomain);
  return shop.id;
}

export {
  ensurePlan,
  getShopWithPlanByDomain,
  getShopWithPlanById,
  isPlanAccessError,
  buildPlanAccessErrorBody,
  PlanAccessError,
  serializePlanContext,
};

export type {
  EnsurePlanOptions,
  EnsurePlanResult,
  ShopPlanRecord,
  PlanUsageSummary,
  PlanSnapshotPayload,
  SerializedPlanContext,
};
