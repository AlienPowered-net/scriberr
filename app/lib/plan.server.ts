// app/lib/plan.server.ts
// Server-only helpers for plan management (downgrade, alignment)

import type { Subscription, SubscriptionStatus } from "@prisma/client";
import { prisma } from "~/utils/db.server";

/**
 * Determines if a subscription grants PRO access.
 * Returns true if:
 * - status is ACTIVE, OR
 * - status is CANCELED but accessUntil is in the future (grace period)
 */
export function hasProAccess(
  subscription: Pick<Subscription, "status" | "accessUntil"> | null | undefined
): boolean {
  if (!subscription) {
    return false;
  }

  // Active subscription = PRO access
  if (subscription.status === "ACTIVE") {
    return true;
  }

  // Canceled subscription with future accessUntil = still has PRO access
  if (subscription.status === "CANCELED" && subscription.accessUntil) {
    const accessUntilDate = new Date(subscription.accessUntil);
    const now = new Date();
    return accessUntilDate > now;
  }

  return false;
}

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
 * If a shop is PRO but has no valid PRO access (active or within grace period),
 * they are downgraded to FREE.
 * This catches edge cases like missed webhooks, stale data, or expired grace periods.
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
  const proAccess = hasProAccess(sub);

  if (!proAccess && shop.plan === "PRO") {
    console.info(
      "[Plan Guard] Downgrading PRO → FREE due to no valid PRO access",
      {
        shopId: shop.id,
        shopDomain,
        currentPlan: shop.plan,
        subscriptionStatus: sub?.status ?? null,
        accessUntil: sub?.accessUntil ?? null,
      },
    );

    await prisma.shop.update({
      where: { id: shop.id },
      data: { plan: "FREE" },
    });
  }
}

