// app/lib/plan.server.ts
// Server-only helpers for plan management (downgrade, alignment)

import { prisma } from "~/utils/db.server";

/**
 * Downgrades a shop to FREE plan and marks all subscriptions as CANCELED.
 * Called when the app is uninstalled.
 */
export async function downgradeShopToFreeByDomain(shopDomain: string) {
  console.info("[Plan] Downgrading shop to FREE by domain", { shopDomain });

  const shop = await prisma.shop.findUnique({
    where: { domain: shopDomain },
    include: { subscription: true },
  });

  if (!shop) {
    console.warn("[Plan] No shop found to downgrade", { shopDomain });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.shop.update({
      where: { id: shop.id },
      data: { plan: "FREE" },
    });

    // Mark subscription as CANCELED (single L per Prisma schema enum)
    await tx.subscription.updateMany({
      where: { shopId: shop.id },
      data: { status: "CANCELED" },
    });
  });

  console.info("[Plan] Shop downgraded to FREE and subscriptions marked CANCELED", {
    shopDomain,
    shopId: shop.id,
  });
}

/**
 * Safety guard: Ensures a shop's plan is aligned with their subscription status.
 * If a shop is PRO but has no ACTIVE subscription, they are downgraded to FREE.
 * This catches edge cases like missed webhooks or stale data.
 */
export async function ensurePlanAlignedWithSubscription(shopDomain: string) {
  const shop = await prisma.shop.findUnique({
    where: { domain: shopDomain },
    include: { subscription: true },
  });

  if (!shop) {
    console.warn("[Plan Guard] No shop found for domain", { shopDomain });
    return;
  }

  const sub = shop.subscription;
  const hasActiveSub = sub && sub.status === "ACTIVE";

  if (!hasActiveSub && shop.plan === "PRO") {
    console.info(
      "[Plan Guard] Downgrading PRO → FREE due to missing active subscription",
      {
        shopId: shop.id,
        shopDomain,
        currentPlan: shop.plan,
        subscriptionStatus: sub?.status ?? null,
      },
    );

    await prisma.shop.update({
      where: { id: shop.id },
      data: { plan: "FREE" },
    });
  }
}

